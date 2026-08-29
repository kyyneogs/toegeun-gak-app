import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FallbackTimetable } from '$lib/adapters/gtfs/fallback-timetable';
import { GtfsTimetable } from '$lib/adapters/gtfs/gtfs-timetable';
import { KakaoScheduledRouteProvider } from '$lib/adapters/kakao/kakao-scheduled-route-provider';
import type { KakaoTransitClient } from '$lib/adapters/kakao/kakao-transit-client';
import type { KakaoTransitResponse } from '$lib/adapters/kakao/kakao-transit-document';
import { EstimatedTimetable } from '$lib/adapters/gtfs/estimated-timetable';
import { combineLocalDateAndClock, formatClock } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);
const POINTS = {
	origin: { name: '회사', latitude: 37.39, longitude: 127.11 },
	destination: { name: '집', latitude: 37.41, longitude: 127.12 }
};
const GTFS_FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../gtfs/fixtures/simple');

const PAYLOAD: KakaoTransitResponse = {
	status: 'OK',
	routes: [
		{
			properties: { totalTime: 1800, transfers: 0 },
			steps: [
				{ properties: { type: 'WALKING', time: 360, stops: [] } },
				{
					properties: {
						type: 'BUS',
						time: 1200,
						stops: [{ name: '판교역' }, { name: '강남역' }],
						vehicles: [{ type: '광역', name: '5001' }]
					}
				},
				{ properties: { type: 'WALKING', time: 240, stops: [] } }
			]
		}
	]
};

function stubClient(): KakaoTransitClient & { calls: number } {
	const client = {
		calls: 0,
		search: async () => {
			client.calls += 1;
			return PAYLOAD;
		}
	};
	return client;
}

describe('KakaoScheduledRouteProvider', () => {
	it('calls Kakao once for live and scheduled lookups', async () => {
		const client = stubClient();
		const provider = new KakaoScheduledRouteProvider(client, new EstimatedTimetable());

		const live = await provider.findLiveRoute(POINTS);
		const first = await provider.findRoutes({
			...POINTS,
			departureAt: combineLocalDateAndClock('18:00', DAY)
		});
		const second = await provider.findRoutes({
			...POINTS,
			departureAt: combineLocalDateAndClock('18:10', DAY)
		});

		expect(client.calls).toBe(1);
		expect(live?.provider).toBe('kakao');
		expect(first[0]?.provider).toBe('schedule');
		expect(second[0]?.provider).toBe('schedule');
		expect(first[0]?.scheduleSource).toBe('estimated');
		expect(first[0]?.departureAt).not.toBe(second[0]?.departureAt);
	});

	it('uses GTFS stop_times instead of the 20-minute estimate', async () => {
		const client = stubClient();
		const provider = new KakaoScheduledRouteProvider(
			client,
			new FallbackTimetable(new GtfsTimetable(GTFS_FIXTURE_DIR), new EstimatedTimetable())
		);

		const [route] = await provider.findRoutes({
			...POINTS,
			departureAt: combineLocalDateAndClock('18:00', DAY)
		});
		const bus = route?.sections.find((section) => section.type === 'bus');

		expect(route?.scheduleSource).toBe('gtfs');
		expect(formatClock(new Date(bus!.departureAt))).toBe('18:10');
		expect(route?.waitingTimeSeconds).toBe(4 * 60);
		expect(client.calls).toBe(1);
	});
});

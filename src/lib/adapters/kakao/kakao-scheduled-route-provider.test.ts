import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EmptyTimetable, GtfsTimetable } from '$lib/adapters/gtfs/gtfs-timetable';
import { KakaoScheduledRouteProvider } from '$lib/adapters/kakao/kakao-scheduled-route-provider';
import type { KakaoTransitClient } from '$lib/adapters/kakao/kakao-transit-client';
import type { KakaoTransitResponse } from '$lib/adapters/kakao/kakao-transit-document';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
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
						time: 9999,
						stops: [{ name: '판교역' }, { name: '강남역' }],
						vehicles: [
							{ type: '광역', name: '5001' },
							{ type: '광역', name: '5002' }
						]
					}
				},
				{ properties: { type: 'WALKING', time: 240, stops: [] } }
			]
		},
		{
			properties: { totalTime: 900, transfers: 0 },
			steps: [
				{ properties: { type: 'WALKING', time: 360, stops: [] } },
				{
					properties: {
						type: 'SUBWAY',
						time: 1111,
						stops: [{ name: '판교역' }, { name: '강남역' }],
						vehicles: [{ type: '지하철', name: '2호선' }]
					}
				},
				{ properties: { type: 'WALKING', time: 240, stops: [] } }
			]
		}
	]
};

function stubClient(
	payload: KakaoTransitResponse = PAYLOAD
): KakaoTransitClient & { calls: number } {
	const client = {
		calls: 0,
		search: async () => {
			client.calls += 1;
			return payload;
		}
	};
	return client;
}

describe('KakaoScheduledRouteProvider', () => {
	it('calls Kakao once for live and scheduled lookups', async () => {
		const client = stubClient();
		const provider = new KakaoScheduledRouteProvider(client, new GtfsTimetable(GTFS_FIXTURE_DIR));

		const live = await provider.findLiveRoute(POINTS);
		const first = await provider.findRoutes({
			...POINTS,
			departureAt: combineLocalDateAndClock('18:00', DAY)
		});
		const second = await provider.findRoutes({
			...POINTS,
			departureAt: combineLocalDateAndClock('18:00', DAY)
		});

		expect(client.calls).toBe(1);
		expect(live?.provider).toBe('kakao');
		expect(first).toHaveLength(2);
		expect(second).toHaveLength(2);
	});

	it('recalculates with GTFS and ignores Kakao transit times', async () => {
		const client = stubClient();
		const provider = new KakaoScheduledRouteProvider(client, new GtfsTimetable(GTFS_FIXTURE_DIR));

		const routes = await provider.findRoutes({
			...POINTS,
			departureAt: combineLocalDateAndClock('18:00', DAY)
		});
		const busRoute = routes.find((route) =>
			route.sections.some((section) => section.type === 'bus')
		);
		const bus = busRoute?.sections.find((section) => section.type === 'bus');

		expect(busRoute?.scheduleSource).toBe('gtfs');
		expect(formatClock(new Date(bus!.departureAt))).toBe('18:15');
		expect(formatClock(new Date(bus!.arrivalAt))).toBe('18:40');
		expect(bus?.routeId).toBe('5002');
	});

	it('adds GTFS access walks when Kakao starts at the bus stop', async () => {
		const client = stubClient({
			status: 'OK',
			routes: [
				{
					steps: [
						{
							properties: {
								type: 'BUS',
								time: 800,
								stops: [{ name: '판교역' }, { name: '강남역' }],
								vehicles: [{ name: '5002' }]
							}
						}
					]
				}
			]
		});
		const provider = new KakaoScheduledRouteProvider(client, new GtfsTimetable(GTFS_FIXTURE_DIR));
		const routes = await provider.findRoutes({
			origin: { name: '회사', latitude: 37.39, longitude: 127.11 },
			destination: { name: '집', latitude: 37.497, longitude: 127.027 },
			departureAt: combineLocalDateAndClock('18:00', DAY)
		});

		expect(routes[0]?.sections[0]?.type).toBe('walk');
		expect(routes[0]?.walkingTimeSeconds).toBeGreaterThan(0);
	});

	it('throws with failure points when every topology has no trip', async () => {
		const client = stubClient();
		const provider = new KakaoScheduledRouteProvider(client, new EmptyTimetable());

		try {
			await provider.findRoutes({
				...POINTS,
				departureAt: combineLocalDateAndClock('18:00', DAY)
			});
			expect.fail('should throw');
		} catch (error) {
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).code).toBe(ERROR_CODES.ROUTE_NOT_FOUND);
			expect((error as AppError).message).toContain('경로 1');
			expect((error as AppError).message).toContain('경로 2');
		}
	});
});

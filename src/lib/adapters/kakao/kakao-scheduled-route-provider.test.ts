import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGtfsSliceFromDirectory } from '$lib/adapters/gtfs/load-gtfs-slice';
import { SqlGtfsTimetable } from '$lib/adapters/gtfs/sql-gtfs-timetable';
import { EmptyTimetable, GtfsTimetable } from '$lib/adapters/gtfs/gtfs-timetable';
import { KakaoScheduledRouteProvider } from '$lib/adapters/kakao/kakao-scheduled-route-provider';
import { resetDatabaseForTests } from '$lib/server/db';
import type { KakaoTransitClient } from '$lib/adapters/kakao/kakao-transit-client';
import type { KakaoTransitResponse } from '$lib/adapters/kakao/kakao-transit-document';
import { ERROR_CODES } from '$lib/constants/errors';
import { HEADWAY_ALT_COST_KRW } from '$lib/constants/recommendation';
import { AppError } from '$lib/domain/errors';
import type { NextTripQuery, TimetablePort } from '$lib/ports/timetable-port';
import { combineLocalDateAndClock, formatClock } from '$lib/utils/time';
import { afterEach, describe, expect, it } from 'vitest';

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

class RecordingTimetable implements TimetablePort {
	readonly queriedRouteIds: string[] = [];

	constructor(private readonly inner: GtfsTimetable) {}

	prepare(routeIds: string[], serviceDate: Date): Promise<void> {
		return this.inner.prepare(routeIds, serviceDate);
	}

	findStopCoordinates(stopName: string) {
		return this.inner.findStopCoordinates(stopName);
	}

	async findNextTrip(query: NextTripQuery) {
		this.queriedRouteIds.push(query.routeId);
		return this.inner.findNextTrip(query);
	}
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

	it('measures next-bus loss on the winning route only, not Kakao alternatives', async () => {
		const client = stubClient();
		const timetable = new RecordingTimetable(new GtfsTimetable(GTFS_FIXTURE_DIR));
		const provider = new KakaoScheduledRouteProvider(client, timetable);

		const routes = await provider.findRoutes({
			...POINTS,
			departureAt: combineLocalDateAndClock('18:00', DAY)
		});
		const winner = routes.find((route) => route.headwayLoss);

		expect(winner?.sections.some((section) => section.routeId === '5002')).toBe(true);
		expect(winner?.headwayLoss).toEqual({
			kind: 'lastTrip',
			routeId: '5002',
			estimatedCostKrw: HEADWAY_ALT_COST_KRW
		});
		expect(timetable.queriedRouteIds.filter((routeId) => routeId === '5001')).toHaveLength(1);
		expect(
			timetable.queriedRouteIds.filter((routeId) => routeId === '5002').length
		).toBeGreaterThan(1);
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
		expect(routes[0]?.walkingTimeSeconds).toBeGreaterThanOrEqual(60);
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

	it('reproduces bus board and alight times from the SQL timetable', async () => {
		await resetDatabaseForTests();
		await loadGtfsSliceFromDirectory(GTFS_FIXTURE_DIR);
		const client = stubClient();
		const provider = new KakaoScheduledRouteProvider(client, new SqlGtfsTimetable());

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
});

afterEach(async () => {
	await resetDatabaseForTests();
});

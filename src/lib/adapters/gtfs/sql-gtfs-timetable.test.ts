import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGtfsSliceFromDirectory } from '$lib/adapters/gtfs/load-gtfs-slice';
import {
	resetSqlGtfsQueryInvocations,
	SqlGtfsTimetable,
	sqlGtfsQueryInvocations
} from '$lib/adapters/gtfs/sql-gtfs-timetable';
import { queryOne, resetDatabaseForTests } from '$lib/server/db';
import { combineLocalDateAndClock, formatClock } from '$lib/utils/time';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);
const REMOVED_DAY = new Date(2026, 7, 30);
const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/simple');

beforeEach(async () => {
	await resetDatabaseForTests();
	await loadGtfsSliceFromDirectory(FIXTURE_DIR);
});

afterEach(async () => {
	await resetDatabaseForTests();
});

describe('SqlGtfsTimetable.findNextTrip', () => {
	it('returns the next board and alight on the same trip', async () => {
		const timetable = new SqlGtfsTimetable();
		const result = await timetable.findNextTrip({
			routeId: '146번',
			boardStopName: '정류장',
			alightStopName: '강남역',
			after: combineLocalDateAndClock('18:13', DAY),
			serviceDate: DAY
		});

		expect(result?.tripId).toBe('146_B');
		expect(formatClock(result!.boardTime)).toBe('18:25');
		expect(formatClock(result!.alightTime)).toBe('18:55');
	});

	it('matches Kakao typed route names and 역-normalized stops', async () => {
		const timetable = new SqlGtfsTimetable();
		const result = await timetable.findNextTrip({
			routeId: '광역:5001',
			boardStopName: '판교 역',
			alightStopName: '강남 역',
			after: combineLocalDateAndClock('18:06', DAY),
			serviceDate: DAY
		});

		expect(formatClock(result!.boardTime)).toBe('18:10');
		expect(formatClock(result!.alightTime)).toBe('19:20');
	});

	it('uses subway line names the same way as bus route ids', async () => {
		const timetable = new SqlGtfsTimetable();
		const result = await timetable.findNextTrip({
			routeId: '2호선',
			boardStopName: '판교역',
			alightStopName: '강남역',
			after: combineLocalDateAndClock('18:06', DAY),
			serviceDate: DAY
		});

		expect(result?.tripId).toBe('2_A');
		expect(formatClock(result!.boardTime)).toBe('18:20');
		expect(formatClock(result!.alightTime)).toBe('18:50');
	});

	it('boards a subway even when a bus stop reuses the Kakao station name', async () => {
		const timetable = new SqlGtfsTimetable();
		const result = await timetable.findNextTrip({
			routeId: '8호선',
			boardStopName: '모란역',
			alightStopName: '잠실역',
			after: combineLocalDateAndClock('18:06', DAY),
			serviceDate: DAY
		});

		expect(result?.tripId).toBe('8_A');
		expect(formatClock(result!.boardTime)).toBe('18:20');
		expect(formatClock(result!.alightTime)).toBe('18:40');
	});

	it('applies calendar_dates removals over calendar.txt', async () => {
		const timetable = new SqlGtfsTimetable();
		const result = await timetable.findNextTrip({
			routeId: '146',
			boardStopName: '정류장',
			alightStopName: '강남역',
			after: combineLocalDateAndClock('18:00', REMOVED_DAY),
			serviceDate: REMOVED_DAY
		});

		expect(result).toBeNull();
	});

	it('returns coordinates for a matched stop name', async () => {
		const timetable = new SqlGtfsTimetable();
		const points = await timetable.findStopCoordinates('판교역');

		expect(points).toEqual([{ latitude: 37.394, longitude: 127.111 }]);
	});

	it('serves findNextTrip from memory after prepare', async () => {
		const timetable = new SqlGtfsTimetable();
		await timetable.prepare(['8호선'], DAY);
		resetSqlGtfsQueryInvocations();

		const result = await timetable.findNextTrip({
			routeId: '8호선',
			boardStopName: '모란역',
			alightStopName: '잠실역',
			after: combineLocalDateAndClock('18:06', DAY),
			serviceDate: DAY
		});

		expect(result?.tripId).toBe('8_A');
		expect(sqlGtfsQueryInvocations()).toBe(0);
	});
});

describe('loadGtfsSliceFromDirectory', () => {
	it('loads CSV route_id values without dropping extra short names', async () => {
		const wrong = await queryOne<{ route_id: string }>(
			'SELECT route_id FROM gtfs_routes WHERE route_short_name = $1',
			['WRONG']
		);
		const bus = await queryOne<{ route_id: string }>(
			'SELECT route_id FROM gtfs_routes WHERE route_short_name = $1',
			['5002']
		);

		expect(wrong?.route_id).toBe('WRONG');
		expect(bus?.route_id).toBe('5002');
	});
});

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	EmptyTimetable,
	GtfsTimetable,
	tryCreateGtfsTimetable
} from '$lib/adapters/gtfs/gtfs-timetable';
import { GTFS_SEOUL_SEONGNAM_DIR } from '$lib/constants/gtfs-paths';
import { combineLocalDateAndClock, formatClock } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);
const REMOVED_DAY = new Date(2026, 7, 30);
const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/simple');

describe('GtfsTimetable.findNextTrip', () => {
	it('returns the next board and alight on the same trip', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
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
		const timetable = new GtfsTimetable(FIXTURE_DIR);
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
		const timetable = new GtfsTimetable(FIXTURE_DIR);
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
		const timetable = new GtfsTimetable(FIXTURE_DIR);
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

	it('finds Seoul line 8 from 모란역 to 잠실역 in the corridor slice', async () => {
		const timetable = tryCreateGtfsTimetable(GTFS_SEOUL_SEONGNAM_DIR);

		if (!timetable) {
			return;
		}

		const startedAt = Date.now();
		const result = await timetable.findNextTrip({
			routeId: '8호선',
			boardStopName: '모란역',
			alightStopName: '잠실역',
			after: combineLocalDateAndClock('18:00', DAY),
			serviceDate: DAY
		});

		expect(result).not.toBeNull();
		expect(result!.alightTime.getTime()).toBeGreaterThan(result!.boardTime.getTime());
		expect(Date.now() - startedAt).toBeLessThan(8_000);
	});

	it('converts GTFS clocks past 24:00 onto the service date', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
		const result = await timetable.findNextTrip({
			routeId: '146',
			boardStopName: '정류장',
			alightStopName: '강남역',
			after: combineLocalDateAndClock('23:00', DAY),
			serviceDate: DAY
		});

		expect(result?.tripId).toBe('146_NIGHT');
		expect(result!.boardTime.getTime()).toBe(
			combineLocalDateAndClock('01:30', new Date(2026, 7, 30)).getTime()
		);
		expect(result!.alightTime.getTime()).toBe(
			combineLocalDateAndClock('01:55', new Date(2026, 7, 30)).getTime()
		);
	});

	it('skips a trip that never serves the alight stop', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
		const result = await timetable.findNextTrip({
			routeId: 'WRONG',
			boardStopName: '판교역',
			alightStopName: '강남역',
			after: combineLocalDateAndClock('18:00', DAY),
			serviceDate: DAY
		});

		expect(result).toBeNull();
	});

	it('applies calendar_dates removals over calendar.txt', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
		const result = await timetable.findNextTrip({
			routeId: '146',
			boardStopName: '정류장',
			alightStopName: '강남역',
			after: combineLocalDateAndClock('18:00', REMOVED_DAY),
			serviceDate: REMOVED_DAY
		});

		expect(result).toBeNull();
	});

	it('indexes stop_times once across parallel lookups', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
		await timetable.prepare(['5001', '5002'], DAY);

		const [first, second] = await Promise.all([
			timetable.findNextTrip({
				routeId: '5001',
				boardStopName: '판교역',
				alightStopName: '강남역',
				after: combineLocalDateAndClock('18:06', DAY),
				serviceDate: DAY
			}),
			timetable.findNextTrip({
				routeId: '5002',
				boardStopName: '판교역',
				alightStopName: '강남역',
				after: combineLocalDateAndClock('18:06', DAY),
				serviceDate: DAY
			})
		]);

		expect(formatClock(first!.alightTime)).toBe('19:20');
		expect(formatClock(second!.alightTime)).toBe('18:40');
	});

	it('returns null when the route or stop does not match', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
		const unknownRoute = await timetable.findNextTrip({
			routeId: '9999',
			boardStopName: '정류장',
			alightStopName: '강남역',
			after: combineLocalDateAndClock('18:00', DAY),
			serviceDate: DAY
		});
		const unknownStop = await timetable.findNextTrip({
			routeId: '146',
			boardStopName: '없는정류장',
			alightStopName: '강남역',
			after: combineLocalDateAndClock('18:00', DAY),
			serviceDate: DAY
		});

		expect(unknownRoute).toBeNull();
		expect(unknownStop).toBeNull();
	});

	it('returns coordinates for a matched stop name', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
		const points = await timetable.findStopCoordinates('판교역');

		expect(points).toEqual([{ latitude: 37.394, longitude: 127.111 }]);
	});
});

describe('tryCreateGtfsTimetable', () => {
	it('returns null when GTFS_DIR is empty', () => {
		expect(tryCreateGtfsTimetable(undefined)).toBeNull();
		expect(tryCreateGtfsTimetable('')).toBeNull();
	});

	it('returns null when required files are missing', () => {
		expect(tryCreateGtfsTimetable('/tmp/gtfs-dir-that-does-not-exist')).toBeNull();
	});

	it('opens a folder that has the required CSV files', () => {
		expect(tryCreateGtfsTimetable(FIXTURE_DIR)).toBeInstanceOf(GtfsTimetable);
	});

	it('opens the Seoul-Seongnam slice when that folder exists', async () => {
		const timetable = tryCreateGtfsTimetable(GTFS_SEOUL_SEONGNAM_DIR);

		if (!timetable) {
			return;
		}

		const points = await timetable.findStopCoordinates('판교역');
		expect(points.length).toBeGreaterThan(0);
	});
});

describe('EmptyTimetable', () => {
	it('never returns a trip', async () => {
		const timetable = new EmptyTimetable();
		const result = await timetable.findNextTrip({
			routeId: '146',
			boardStopName: '정류장',
			alightStopName: '강남역',
			after: combineLocalDateAndClock('18:00', DAY),
			serviceDate: DAY
		});

		expect(result).toBeNull();
	});
});

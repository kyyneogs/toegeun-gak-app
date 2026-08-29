import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FallbackTimetable } from '$lib/adapters/gtfs/fallback-timetable';
import { GtfsTimetable, tryCreateGtfsTimetable } from '$lib/adapters/gtfs/gtfs-timetable';
import { EstimatedTimetable } from '$lib/adapters/gtfs/estimated-timetable';
import { combineLocalDateAndClock, formatClock } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);
const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/simple');

describe('GtfsTimetable', () => {
	it('returns the next stop_times departure after the walk-up time', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
		const result = await timetable.nextDeparture({
			routeName: '146번',
			stopName: '정류장',
			after: combineLocalDateAndClock('18:13', DAY)
		});

		expect(result?.source).toBe('gtfs');
		expect(formatClock(result!.departureAt)).toBe('18:25');
	});

	it('matches Kakao typed route names and 역-normalized stops', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
		const result = await timetable.nextDeparture({
			routeName: '광역:5001',
			stopName: '판교 역',
			after: combineLocalDateAndClock('18:06', DAY)
		});

		expect(result?.source).toBe('gtfs');
		expect(formatClock(result!.departureAt)).toBe('18:10');
	});

	it('returns null when the route or stop does not match', async () => {
		const timetable = new GtfsTimetable(FIXTURE_DIR);
		const unknownRoute = await timetable.nextDeparture({
			routeName: '9999',
			stopName: '정류장',
			after: combineLocalDateAndClock('18:00', DAY)
		});
		const unknownStop = await timetable.nextDeparture({
			routeName: '146',
			stopName: '없는정류장',
			after: combineLocalDateAndClock('18:00', DAY)
		});

		expect(unknownRoute).toBeNull();
		expect(unknownStop).toBeNull();
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
});

describe('FallbackTimetable', () => {
	it('uses estimated headway when GTFS misses', async () => {
		const timetable = new FallbackTimetable(
			new GtfsTimetable(FIXTURE_DIR),
			new EstimatedTimetable()
		);
		const result = await timetable.nextDeparture({
			routeName: '없는노선',
			stopName: '정류장',
			after: combineLocalDateAndClock('18:13', DAY)
		});

		expect(result?.source).toBe('estimated');
		expect(formatClock(result!.departureAt)).toBe('18:20');
	});

	it('keeps a GTFS hit', async () => {
		const timetable = new FallbackTimetable(
			new GtfsTimetable(FIXTURE_DIR),
			new EstimatedTimetable()
		);
		const result = await timetable.nextDeparture({
			routeName: '146',
			stopName: '정류장',
			after: combineLocalDateAndClock('18:13', DAY)
		});

		expect(result?.source).toBe('gtfs');
		expect(formatClock(result!.departureAt)).toBe('18:25');
	});

	it('uses estimated headway when GTFS_DIR is absent', async () => {
		const timetable = new FallbackTimetable(null, new EstimatedTimetable());
		const result = await timetable.nextDeparture({
			routeName: '146',
			stopName: '정류장',
			after: combineLocalDateAndClock('18:13', DAY)
		});

		expect(result?.source).toBe('estimated');
		expect(formatClock(result!.departureAt)).toBe('18:20');
	});
});

import { EstimatedTimetable } from '$lib/adapters/gtfs/estimated-timetable';
import { combineLocalDateAndClock, formatClock } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

describe('EstimatedTimetable', () => {
	it('returns the next 20-minute headway after the stop arrival', async () => {
		const timetable = new EstimatedTimetable();
		const result = await timetable.nextDeparture({
			routeName: '146',
			stopName: '정류장',
			after: combineLocalDateAndClock('18:13', DAY)
		});

		expect(result?.source).toBe('estimated');
		expect(formatClock(result!.departureAt)).toBe('18:20');
	});
});

import { selectBestGtfsTrip } from '$lib/domain/optimization/select-best-trip';
import type { TransitSegment, TripChoice } from '$lib/domain/optimization/types';
import type { NextTripQuery, TimetablePort } from '$lib/ports/timetable-port';
import { combineLocalDateAndClock } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

const SEGMENT: TransitSegment = {
	type: 'BUS',
	stopId: '판교역',
	alightStopId: '강남역',
	candidateRouteIds: ['5001', '5002'],
	startPlaceName: '판교역',
	endPlaceName: '강남역'
};

class ScriptedTimetable implements TimetablePort {
	inFlight = 0;
	maxInFlight = 0;

	constructor(private readonly table: Record<string, TripChoice | null>) {}

	async findNextTrip(query: NextTripQuery): Promise<TripChoice | null> {
		this.inFlight += 1;
		this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
		await delay(10);
		this.inFlight -= 1;
		return this.table[query.routeId] ?? null;
	}
}

describe('selectBestGtfsTrip', () => {
	it('picks the candidate with the earliest alight even if it boards later', async () => {
		const timetable = new ScriptedTimetable({
			'5001': {
				routeId: '5001',
				tripId: 'slow',
				boardTime: combineLocalDateAndClock('18:10', DAY),
				alightTime: combineLocalDateAndClock('19:20', DAY)
			},
			'5002': {
				routeId: '5002',
				tripId: 'fast',
				boardTime: combineLocalDateAndClock('18:15', DAY),
				alightTime: combineLocalDateAndClock('18:40', DAY)
			}
		});

		const chosen = await selectBestGtfsTrip(timetable, {
			segment: SEGMENT,
			after: combineLocalDateAndClock('18:06', DAY),
			serviceDate: DAY
		});

		expect(chosen?.routeId).toBe('5002');
		expect(timetable.maxInFlight).toBeGreaterThan(1);
	});

	it('returns null when every candidate has no trip', async () => {
		const timetable = new ScriptedTimetable({ '5001': null, '5002': null });
		const chosen = await selectBestGtfsTrip(timetable, {
			segment: SEGMENT,
			after: combineLocalDateAndClock('18:06', DAY),
			serviceDate: DAY
		});

		expect(chosen).toBeNull();
	});
});

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

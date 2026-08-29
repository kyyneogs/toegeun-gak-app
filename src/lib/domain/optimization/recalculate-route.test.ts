import { recalculateRoute } from '$lib/domain/optimization/recalculate-route';
import type { TopologyRoute, TripChoice } from '$lib/domain/optimization/types';
import type { NextTripQuery, TimetablePort } from '$lib/ports/timetable-port';
import { combineLocalDateAndClock, formatClock } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

const WALK_BUS_WALK: TopologyRoute = {
	segments: [
		{
			type: 'WALK',
			duration: 6 * 60,
			startPlaceName: '회사',
			endPlaceName: '판교역'
		},
		{
			type: 'BUS',
			stopId: '판교역',
			alightStopId: '강남역',
			candidateRouteIds: ['5001'],
			startPlaceName: '판교역',
			endPlaceName: '강남역'
		},
		{
			type: 'WALK',
			duration: 4 * 60,
			startPlaceName: '강남역',
			endPlaceName: '집'
		}
	]
};

class ScriptedTimetable implements TimetablePort {
	constructor(private readonly choice: TripChoice | null) {}

	async findNextTrip(query: NextTripQuery): Promise<TripChoice | null> {
		if (query.routeId !== '5001') {
			return null;
		}

		return this.choice;
	}
}

describe('recalculateRoute', () => {
	it('walks then boards the next GTFS trip and walks to the destination', async () => {
		const route = await recalculateRoute(
			WALK_BUS_WALK,
			combineLocalDateAndClock('18:00', DAY),
			DAY,
			new ScriptedTimetable({
				routeId: '5001',
				tripId: '5001_A',
				boardTime: combineLocalDateAndClock('18:10', DAY),
				alightTime: combineLocalDateAndClock('19:20', DAY)
			})
		);

		expect(route.invalid).toBe(false);
		expect(formatClock(route.finalArrivalTime!)).toBe('19:24');
		expect(route.chosenTrips).toHaveLength(1);
	});

	it('marks the route invalid when a transit segment has no trip', async () => {
		const route = await recalculateRoute(
			WALK_BUS_WALK,
			combineLocalDateAndClock('18:00', DAY),
			DAY,
			new ScriptedTimetable(null),
			2
		);

		expect(route.invalid).toBe(true);
		expect(route.finalArrivalTime).toBeNull();
		expect(route.failure?.routeIndex).toBe(2);
		expect(route.failure?.segmentIndex).toBe(1);
	});
});

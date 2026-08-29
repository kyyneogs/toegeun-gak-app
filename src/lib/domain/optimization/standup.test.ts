import { standupAt } from '$lib/domain/optimization/standup';
import type { RecalculatedRoute } from '$lib/domain/optimization/types';
import { combineLocalDateAndClock, formatClock } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

const ROUTE: RecalculatedRoute = {
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
			candidateRouteIds: ['5002'],
			startPlaceName: '판교역',
			endPlaceName: '강남역'
		}
	],
	invalid: false,
	finalArrivalTime: combineLocalDateAndClock('18:40', DAY),
	chosenTrips: [
		{
			routeId: '5002',
			tripId: '5002_A',
			boardTime: combineLocalDateAndClock('18:15', DAY),
			alightTime: combineLocalDateAndClock('18:40', DAY)
		}
	],
	failure: null
};

describe('standupAt', () => {
	it('starts walking just in time for the first trip', () => {
		const standup = standupAt(ROUTE, combineLocalDateAndClock('18:00', DAY));

		expect(formatClock(standup)).toBe('18:09');
	});

	it('does not leave before the user can finish work', () => {
		const standup = standupAt(ROUTE, combineLocalDateAndClock('18:12', DAY));

		expect(formatClock(standup)).toBe('18:12');
	});

	it('uses the first boarding time when there is no walk to the stop', () => {
		const noWalk: RecalculatedRoute = {
			...ROUTE,
			segments: ROUTE.segments.slice(1)
		};

		expect(formatClock(standupAt(noWalk, combineLocalDateAndClock('18:00', DAY)))).toBe('18:15');
	});
});

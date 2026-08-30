import { materializeOptimizedRoute } from '$lib/domain/optimization/materialize';
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
		},
		{
			type: 'WALK',
			duration: 4 * 60,
			startPlaceName: '강남역',
			endPlaceName: '집'
		}
	],
	invalid: false,
	finalArrivalTime: combineLocalDateAndClock('18:44', DAY),
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

describe('materializeOptimizedRoute', () => {
	it('starts the first walk just in time instead of waiting at the stop', () => {
		const route = materializeOptimizedRoute(
			ROUTE,
			combineLocalDateAndClock('18:00', DAY),
			'gtfs_0'
		);
		const walk = route?.sections.find((section) => section.type === 'walk');
		const wait = route?.sections.find((section) => section.type === 'wait');
		const bus = route?.sections.find((section) => section.type === 'bus');

		expect(route?.scheduleSource).toBe('gtfs');
		expect(formatClock(new Date(route!.departureAt))).toBe('18:09');
		expect(formatClock(new Date(walk!.departureAt))).toBe('18:09');
		expect(wait).toBeUndefined();
		expect(formatClock(new Date(bus!.departureAt))).toBe('18:15');
		expect(route?.chosenTrips?.[0]?.tripId).toBe('5002_A');
	});

	it('keeps walking immediately when comparing wait at arbitrary leave times', () => {
		const route = materializeOptimizedRoute(
			ROUTE,
			combineLocalDateAndClock('18:00', DAY),
			'wait_sample',
			{ alignWalkToBoard: false }
		);
		const wait = route?.sections.find((section) => section.type === 'wait');

		expect(formatClock(new Date(route!.departureAt))).toBe('18:00');
		expect(wait?.waitingTimeSeconds).toBe(9 * 60);
	});
});

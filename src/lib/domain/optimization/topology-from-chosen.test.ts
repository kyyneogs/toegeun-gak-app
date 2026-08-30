import { topologyFromChosenRoute } from '$lib/domain/optimization/topology-from-chosen';
import type { TransitRoute } from '$lib/domain/route/route';
import { combineLocalDateAndClock, toIso } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

function iso(clock: string): string {
	return toIso(combineLocalDateAndClock(clock, DAY));
}

describe('topologyFromChosenRoute', () => {
	it('keeps only the chosen route id, not Kakao alternatives', () => {
		const route: TransitRoute = {
			provider: 'gtfs',
			routeId: 'gtfs_1',
			totalTimeSeconds: 900,
			movingTimeSeconds: 800,
			waitingTimeSeconds: 60,
			walkingTimeSeconds: 360,
			transferCount: 0,
			departureAt: iso('18:09'),
			arrivalAt: iso('18:24'),
			sections: [
				{
					sequence: 1,
					type: 'walk',
					startPlaceName: '회사',
					endPlaceName: '송현초',
					departureAt: iso('18:09'),
					arrivalAt: iso('18:15'),
					waitingTimeSeconds: 0
				},
				{
					sequence: 2,
					type: 'bus',
					startPlaceName: '송현초',
					endPlaceName: '시청',
					departureAt: iso('18:15'),
					arrivalAt: iso('18:24'),
					waitingTimeSeconds: 0,
					routeId: '341'
				}
			]
		};

		const topology = topologyFromChosenRoute(route);
		const bus = topology?.segments.find((segment) => segment.type === 'BUS');

		expect(bus && bus.type === 'BUS' ? bus.candidateRouteIds : null).toEqual(['341']);
	});
});

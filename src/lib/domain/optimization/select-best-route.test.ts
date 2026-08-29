import { selectBestRoute, selectEarliestArrival } from '$lib/domain/optimization/select-best-route';
import type { RecalculatedRoute } from '$lib/domain/optimization/types';
import type { TransitRoute } from '$lib/domain/route/route';
import { combineLocalDateAndClock, toIso } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

function recalculated(clock: string, invalid = false): RecalculatedRoute {
	return {
		segments: [],
		invalid,
		finalArrivalTime: invalid ? null : combineLocalDateAndClock(clock, DAY),
		chosenTrips: [],
		failure: invalid
			? {
					routeIndex: 0,
					segmentIndex: 0,
					stopName: '판교역',
					candidateRouteIds: ['5001'],
					reason: 'NO_TRIP_AFTER'
				}
			: null
	};
}

function transit(clock: string): TransitRoute {
	const arrival = combineLocalDateAndClock(clock, DAY);

	return {
		provider: 'gtfs',
		routeId: `route_${clock}`,
		totalTimeSeconds: 1800,
		movingTimeSeconds: 1800,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: 360,
		transferCount: 0,
		departureAt: toIso(combineLocalDateAndClock('18:00', DAY)),
		arrivalAt: toIso(arrival),
		sections: []
	};
}

describe('selectBestRoute', () => {
	it('picks the earliest final arrival', () => {
		const best = selectBestRoute([recalculated('19:20'), recalculated('18:40')]);
		expect(best?.finalArrivalTime?.getTime()).toBe(
			combineLocalDateAndClock('18:40', DAY).getTime()
		);
	});

	it('keeps the earlier Track A route on an arrival tie', () => {
		const first = recalculated('18:40');
		const second = recalculated('18:40');
		const best = selectBestRoute([first, second]);
		expect(best).toBe(first);
	});

	it('ignores invalid routes and returns null when none remain', () => {
		expect(selectBestRoute([recalculated('18:40', true)])).toBeNull();
		expect(
			selectBestRoute([recalculated('19:20', true), recalculated('18:40')])?.finalArrivalTime
		).toEqual(combineLocalDateAndClock('18:40', DAY));
	});
});

describe('selectEarliestArrival', () => {
	it('keeps the first TransitRoute when arrivals are equal', () => {
		const first = transit('18:40');
		const second = transit('18:40');
		expect(selectEarliestArrival([first, second])).toBe(first);
	});
});

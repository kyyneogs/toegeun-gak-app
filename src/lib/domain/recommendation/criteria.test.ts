import {
	alternativesFor,
	filterArrivingBy,
	latestArrivalAt,
	selectEarliestDeparture,
	selectLatestDeparture,
	selectRouteByCriterion
} from '$lib/domain/recommendation/criteria';
import type { TransitRoute } from '$lib/domain/route/route';
import { combineLocalDateAndClock, toIso } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

function route(options: {
	id: string;
	arrive: string;
	depart?: string;
	durationMin?: number;
	walkMin?: number;
	transfers?: number;
}): TransitRoute {
	const departure = combineLocalDateAndClock(options.depart ?? '18:00', DAY);
	const arrival = combineLocalDateAndClock(options.arrive, DAY);

	return {
		provider: 'scripted',
		routeId: options.id,
		totalTimeSeconds: (options.durationMin ?? 40) * 60,
		movingTimeSeconds: (options.durationMin ?? 40) * 60,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: (options.walkMin ?? 8) * 60,
		transferCount: options.transfers ?? 0,
		departureAt: toIso(departure),
		arrivalAt: toIso(arrival),
		sections: []
	};
}

describe('route criteria', () => {
	const fast = route({ id: 'fast', arrive: '18:40', durationMin: 50, walkMin: 12, transfers: 1 });
	const short = route({
		id: 'short',
		arrive: '19:10',
		depart: '18:20',
		durationMin: 30,
		walkMin: 10,
		transfers: 1
	});
	const walk = route({
		id: 'walk',
		arrive: '19:00',
		depart: '18:10',
		durationMin: 55,
		walkMin: 4,
		transfers: 1
	});
	const direct = route({
		id: 'direct',
		arrive: '19:20',
		depart: '18:05',
		durationMin: 70,
		walkMin: 8,
		transfers: 0
	});
	const routes = [fast, short, walk, direct];

	it('picks earliest arrival, shortest ride, least walking, and fewest transfers', () => {
		expect(selectRouteByCriterion(routes, 'earliestArrival')?.routeId).toBe('fast');
		expect(selectRouteByCriterion(routes, 'shortestDuration')?.routeId).toBe('short');
		expect(selectRouteByCriterion(routes, 'leastWalking')?.routeId).toBe('walk');
		expect(selectRouteByCriterion(routes, 'fewestTransfers')?.routeId).toBe('direct');
	});

	it('keeps the first route when the metric ties', () => {
		const first = route({ id: 'first', arrive: '18:40', walkMin: 8 });
		const second = route({ id: 'second', arrive: '18:40', walkMin: 8 });
		expect(selectRouteByCriterion([first, second], 'leastWalking')?.routeId).toBe('first');
	});

	it('filters routes that miss the desired arrival', () => {
		const onTime = filterArrivingBy(routes, combineLocalDateAndClock('19:00', DAY));
		expect(onTime.map((item) => item.routeId)).toEqual(['fast', 'walk']);
	});

	it('picks the latest leave among on-time routes', () => {
		const onTime = filterArrivingBy(routes, combineLocalDateAndClock('19:05', DAY));
		expect(selectLatestDeparture(onTime)?.routeId).toBe('walk');
	});

	it('picks the earliest leave for the naive baseline', () => {
		expect(selectEarliestDeparture(routes)?.routeId).toBe('fast');
	});

	it('uses the latest arrival among options as the saved-time baseline', () => {
		expect(latestArrivalAt(routes)).toBe(direct.arrivalAt);
	});

	it('lists a winner per criterion', () => {
		const alternatives = alternativesFor(routes);
		expect(alternatives).toHaveLength(4);
		expect(alternatives[0]?.criterion).toBe('earliestArrival');
	});
});

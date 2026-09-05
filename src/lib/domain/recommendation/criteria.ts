import type { TransitRoute } from '$lib/domain/route/route';
import { fromIso } from '$lib/utils/time';

export const ROUTE_CRITERIA = [
	'earliestArrival',
	'shortestDuration',
	'leastWalking',
	'fewestTransfers'
] as const;

export type RouteCriterion = (typeof ROUTE_CRITERIA)[number];

export type RecommendationMode = 'leaveAfter' | 'arriveBy';

export function isRouteCriterion(value: string): value is RouteCriterion {
	return (ROUTE_CRITERIA as readonly string[]).includes(value);
}

export function filterArrivingBy(routes: TransitRoute[], desiredArrivalAt: Date): TransitRoute[] {
	const deadline = desiredArrivalAt.getTime();
	return routes.filter((route) => fromIso(route.arrivalAt).getTime() <= deadline);
}

export function selectRouteByCriterion(
	routes: TransitRoute[],
	criterion: RouteCriterion
): TransitRoute | null {
	if (routes.length === 0) {
		return null;
	}

	return routes.reduce((best, route) =>
		compareByCriterion(route, best, criterion) < 0 ? route : best
	);
}

export function selectLatestDeparture(routes: TransitRoute[]): TransitRoute | null {
	if (routes.length === 0) {
		return null;
	}

	return routes.reduce((best, route) => {
		const departureDelta =
			fromIso(route.departureAt).getTime() - fromIso(best.departureAt).getTime();

		if (departureDelta > 0) {
			return route;
		}

		if (departureDelta < 0) {
			return best;
		}

		return fromIso(route.arrivalAt).getTime() < fromIso(best.arrivalAt).getTime() ? route : best;
	});
}

export function latestArrivalAt(routes: TransitRoute[]): string | null {
	if (routes.length === 0) {
		return null;
	}

	return routes.reduce(
		(latest, route) =>
			fromIso(route.arrivalAt).getTime() > fromIso(latest).getTime() ? route.arrivalAt : latest,
		routes[0].arrivalAt
	);
}

export function selectEarliestDeparture(routes: TransitRoute[]): TransitRoute | null {
	if (routes.length === 0) {
		return null;
	}

	return routes.reduce((best, route) => {
		const departureDelta =
			fromIso(route.departureAt).getTime() - fromIso(best.departureAt).getTime();

		if (departureDelta < 0) {
			return route;
		}

		if (departureDelta > 0) {
			return best;
		}

		return fromIso(route.arrivalAt).getTime() < fromIso(best.arrivalAt).getTime() ? route : best;
	});
}

export function alternativesFor(routes: TransitRoute[]): Array<{
	criterion: RouteCriterion;
	route: TransitRoute;
}> {
	const alternatives: Array<{ criterion: RouteCriterion; route: TransitRoute }> = [];

	for (const criterion of ROUTE_CRITERIA) {
		const winner = selectRouteByCriterion(routes, criterion);

		if (winner) {
			alternatives.push({ criterion, route: winner });
		}
	}

	return alternatives;
}

function compareByCriterion(
	left: TransitRoute,
	right: TransitRoute,
	criterion: RouteCriterion
): number {
	const primary = primaryMetric(left, criterion) - primaryMetric(right, criterion);

	if (primary !== 0) {
		return primary;
	}

	return fromIso(left.arrivalAt).getTime() - fromIso(right.arrivalAt).getTime();
}

function primaryMetric(route: TransitRoute, criterion: RouteCriterion): number {
	switch (criterion) {
		case 'earliestArrival':
			return fromIso(route.arrivalAt).getTime();
		case 'shortestDuration':
			return route.totalTimeSeconds;
		case 'leastWalking':
			return route.walkingTimeSeconds;
		case 'fewestTransfers':
			return route.transferCount;
	}
}

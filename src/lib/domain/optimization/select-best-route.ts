import type { RecalculatedRoute } from '$lib/domain/optimization/types';
import type { TransitRoute } from '$lib/domain/route/route';
import { fromIso } from '$lib/utils/time';

export function selectBestRoute(routes: RecalculatedRoute[]): RecalculatedRoute | null {
	let best: RecalculatedRoute | null = null;

	for (const route of routes) {
		if (route.invalid || !route.finalArrivalTime) {
			continue;
		}

		if (
			!best ||
			!best.finalArrivalTime ||
			route.finalArrivalTime.getTime() < best.finalArrivalTime.getTime()
		) {
			best = route;
		}
	}

	return best;
}

export function selectEarliestArrival(routes: TransitRoute[]): TransitRoute | null {
	let best: TransitRoute | null = null;

	for (const route of routes) {
		if (!best || fromIso(route.arrivalAt).getTime() < fromIso(best.arrivalAt).getTime()) {
			best = route;
		}
	}

	return best;
}

export function collectRouteFailures(routes: RecalculatedRoute[]) {
	return routes.flatMap((route) => (route.failure ? [route.failure] : []));
}

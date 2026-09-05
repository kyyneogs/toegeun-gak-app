import type { RecommendedRoute } from '$lib/domain/recommendation/types';
import type { TransitRoute } from '$lib/domain/route/route';

export function toRecommendedRoute(route: TransitRoute): RecommendedRoute {
	return {
		departureAt: route.departureAt,
		expectedArrivalAt: route.arrivalAt,
		totalTimeSeconds: route.totalTimeSeconds,
		waitingTimeSeconds: route.waitingTimeSeconds,
		walkingTimeSeconds: route.walkingTimeSeconds,
		transferCount: route.transferCount,
		route,
		chosenTrips: route.chosenTrips ?? [],
		headwayLoss: route.headwayLoss ?? null
	};
}

import { ERROR_CODES } from '$lib/constants/errors';
import { AppError, isAppError } from '$lib/domain/errors';
import { selectEarliestArrival } from '$lib/domain/optimization/select-best-route';
import type {
	RecommendationInput,
	RecommendationResult,
	RecommendedRoute
} from '$lib/domain/recommendation/types';
import type { TransitRoute } from '$lib/domain/route/route';
import type { RecommendationService } from '$lib/ports/recommendation-service';
import type { RouteProvider } from '$lib/ports/route-provider';
import { createId } from '$lib/utils/id';
import { fromIso, toIso } from '$lib/utils/time';

export class RecommendationApplicationService implements RecommendationService {
	constructor(private readonly routeProvider: RouteProvider) {}

	async recommend(input: RecommendationInput): Promise<RecommendationResult> {
		const departureAfter = fromIso(input.trip.departureFrom);
		const routes = await this.loadTimedRoutes(input, departureAfter);
		const winner = selectEarliestArrival(routes);

		if (!winner) {
			throw new AppError(ERROR_CODES.ROUTE_NOT_FOUND);
		}

		return {
			id: createId('rec'),
			tripId: input.trip.id,
			recommended: toRecommended(winner),
			calculatedAt: toIso(new Date()),
			scheduleSource: winner.scheduleSource
		};
	}

	private async loadTimedRoutes(
		input: RecommendationInput,
		departureAt: Date
	): Promise<TransitRoute[]> {
		try {
			return await this.routeProvider.findRoutes({
				...tripPoints(input),
				departureAt
			});
		} catch (cause) {
			if (isAppError(cause)) {
				throw cause;
			}

			throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT, undefined, cause);
		}
	}
}

function toRecommended(route: TransitRoute): RecommendedRoute {
	return {
		departureAt: route.departureAt,
		expectedArrivalAt: route.arrivalAt,
		totalTimeSeconds: route.totalTimeSeconds,
		waitingTimeSeconds: route.waitingTimeSeconds,
		walkingTimeSeconds: route.walkingTimeSeconds,
		transferCount: route.transferCount,
		route,
		chosenTrips: route.chosenTrips ?? []
	};
}

function tripPoints(input: RecommendationInput) {
	return {
		origin: {
			name: input.trip.origin.name,
			latitude: input.trip.origin.latitude,
			longitude: input.trip.origin.longitude
		},
		destination: {
			name: input.trip.destination.name,
			latitude: input.trip.destination.latitude,
			longitude: input.trip.destination.longitude
		}
	};
}

import { ERROR_CODES } from '$lib/constants/errors';
import { ARRIVE_BY_MISSED_COPY } from '$lib/constants/recommendation';
import { AppError, isAppError } from '$lib/domain/errors';
import {
	alternativesFor,
	filterArrivingBy,
	latestArrivalAt,
	selectLatestDeparture,
	selectRouteByCriterion,
	type RecommendationMode,
	type RouteCriterion
} from '$lib/domain/recommendation/criteria';
import { toRecommendedRoute } from '$lib/domain/recommendation/map-route';
import type {
	RecommendationInput,
	RecommendationResult,
	RouteAlternative
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
		const desiredArrivalAt = input.trip.desiredArrivalAt
			? fromIso(input.trip.desiredArrivalAt)
			: null;
		const candidates = desiredArrivalAt ? filterArrivingBy(routes, desiredArrivalAt) : routes;

		if (candidates.length === 0) {
			throw new AppError(
				ERROR_CODES.RECOMMENDATION_UNAVAILABLE,
				desiredArrivalAt ? ARRIVE_BY_MISSED_COPY : undefined
			);
		}

		const mode = desiredArrivalAt ? 'arriveBy' : 'leaveAfter';
		const criterion = resolveCriterion(input.criterion, mode);
		const winner =
			criterion === 'latestDeparture'
				? selectLatestDeparture(candidates)
				: selectRouteByCriterion(candidates, criterion);

		if (!winner) {
			throw new AppError(ERROR_CODES.ROUTE_NOT_FOUND);
		}

		await this.routeProvider.attachHeadwayLoss?.([winner]);

		return {
			id: createId('rec'),
			tripId: input.trip.id,
			recommended: toRecommendedRoute(winner),
			criterion,
			mode,
			alternatives: toAlternatives(candidates),
			naiveArrivalAt: latestArrivalAt(candidates) ?? winner.arrivalAt,
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

function resolveCriterion(
	requested: RouteCriterion | undefined,
	mode: RecommendationMode
): RouteCriterion | 'latestDeparture' {
	if (requested) {
		return requested;
	}

	return mode === 'arriveBy' ? 'latestDeparture' : 'earliestArrival';
}

function toAlternatives(routes: TransitRoute[]): RouteAlternative[] {
	return alternativesFor(routes).map((item) => ({
		criterion: item.criterion,
		route: toRecommendedRoute(item.route)
	}));
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

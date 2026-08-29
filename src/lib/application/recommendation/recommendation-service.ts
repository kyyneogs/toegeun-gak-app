import { ERROR_CODES } from '$lib/constants/errors';
import { CANDIDATE_INTERVAL_MINUTES } from '$lib/constants/recommendation';
import { AppError, isAppError } from '$lib/domain/errors';
import { generateDepartureCandidates } from '$lib/domain/recommendation/candidates';
import { buildRecommendation, pickBestRoute } from '$lib/domain/recommendation/engine';
import type { RecommendationInput, RecommendationResult } from '$lib/domain/recommendation/types';
import type { TransitRoute } from '$lib/domain/route/route';
import type { RecommendationService } from '$lib/ports/recommendation-service';
import type { RouteProvider } from '$lib/ports/route-provider';
import { fromIso } from '$lib/utils/time';

export interface RecommendationServiceOptions {
	resolveSlotIntervalMinutes?: () => Promise<number>;
}

export class RecommendationApplicationService implements RecommendationService {
	constructor(
		private readonly routeProvider: RouteProvider,
		private readonly options: RecommendationServiceOptions = {}
	) {}

	async recommend(input: RecommendationInput): Promise<RecommendationResult> {
		const windowStart = fromIso(input.trip.departureFrom);
		const windowEnd = fromIso(input.trip.departureUntil);
		const desiredArrivalAt = input.trip.desiredArrivalAt
			? fromIso(input.trip.desiredArrivalAt)
			: undefined;
		const intervalMinutes = await this.resolveSlotIntervalMinutes();
		const departures = generateDepartureCandidates(windowStart, windowEnd, intervalMinutes);

		if (departures.length === 0) {
			throw new AppError(ERROR_CODES.INVALID_REQUEST);
		}

		const liveRoute = await this.loadLiveRoute(input);
		const { routes, rateLimited } = await this.collectSlotRoutes(input, departures);

		if (routes.length === 0) {
			throw new AppError(
				rateLimited ? ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT : ERROR_CODES.ROUTE_NOT_FOUND
			);
		}

		return buildRecommendation({
			tripId: input.trip.id,
			windowStart,
			windowEnd,
			desiredArrivalAt,
			routesByDeparture: routes,
			liveRoute
		});
	}

	private async resolveSlotIntervalMinutes(): Promise<number> {
		if (!this.options.resolveSlotIntervalMinutes) {
			return CANDIDATE_INTERVAL_MINUTES;
		}

		return this.options.resolveSlotIntervalMinutes();
	}

	private async loadLiveRoute(input: RecommendationInput): Promise<TransitRoute | null> {
		if (!this.routeProvider.findLiveRoute) {
			return null;
		}

		return this.routeProvider.findLiveRoute(tripPoints(input));
	}

	private async collectSlotRoutes(
		input: RecommendationInput,
		departures: Date[]
	): Promise<{ routes: TransitRoute[]; rateLimited: boolean }> {
		const routes: TransitRoute[] = [];

		for (const departureAt of departures) {
			try {
				const route = await this.findBestRoute(input, departureAt);
				if (route) {
					routes.push(route);
				}
			} catch (cause) {
				if (isRateLimit(cause)) {
					return { routes, rateLimited: true };
				}

				if (isAppError(cause)) {
					throw cause;
				}

				throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT, undefined, cause);
			}
		}

		return { routes, rateLimited: false };
	}

	private async findBestRoute(
		input: RecommendationInput,
		departureAt: Date
	): Promise<TransitRoute | null> {
		const routes = await this.routeProvider.findRoutes({
			...tripPoints(input),
			departureAt
		});

		return pickBestRoute(routes);
	}
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

function isRateLimit(cause: unknown): boolean {
	return isAppError(cause) && cause.code === ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT;
}

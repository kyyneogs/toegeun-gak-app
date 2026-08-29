import { COMPANY_PLACE, GANGNAM_STATION } from '$lib/adapters/mock/mock-places';
import { RecommendationApplicationService } from '$lib/application/recommendation/recommendation-service';
import { TripApplicationService } from '$lib/application/trip/trip-service';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import type { TransitRoute } from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import { combineLocalDateAndClock, formatClock, toIso } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

function makeRoute(clock: string, totalMinutes: number): TransitRoute {
	const departure = combineLocalDateAndClock('18:00', DAY);
	const arrival = combineLocalDateAndClock(clock, DAY);

	return {
		provider: 'scripted',
		routeId: `route_${clock}`,
		totalTimeSeconds: totalMinutes * 60,
		movingTimeSeconds: totalMinutes * 60,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: 8 * 60,
		transferCount: 0,
		departureAt: toIso(departure),
		arrivalAt: toIso(arrival),
		sections: [],
		scheduleSource: 'gtfs'
	};
}

class ScriptedRouteProvider implements RouteProvider {
	calls = 0;

	constructor(
		private readonly routes: TransitRoute[],
		private readonly rateLimit = false
	) {}

	async findRoutes(): Promise<TransitRoute[]> {
		this.calls += 1;

		if (this.rateLimit) {
			throw new AppError(ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT);
		}

		return this.routes;
	}
}

async function recommendWith(provider: RouteProvider) {
	const tripService = new TripApplicationService();
	const recommendationService = new RecommendationApplicationService(provider);
	const trip = await tripService.createTrip({
		origin: COMPANY_PLACE,
		destination: GANGNAM_STATION,
		departureFrom: combineLocalDateAndClock('18:00', DAY),
		departureUntil: combineLocalDateAndClock('19:00', DAY)
	});

	return recommendationService.recommend({ trip });
}

describe('RecommendationApplicationService', () => {
	it('looks up timed routes once', async () => {
		const provider = new ScriptedRouteProvider([makeRoute('18:40', 40)]);

		await recommendWith(provider);

		expect(provider.calls).toBe(1);
	});

	it('recommends the route that arrives first', async () => {
		const provider = new ScriptedRouteProvider([makeRoute('19:20', 80), makeRoute('18:40', 40)]);
		const result = await recommendWith(provider);

		expect(formatClock(new Date(result.recommended.expectedArrivalAt))).toBe('18:40');
		expect(result.recommended.route.routeId).toBe('route_18:40');
	});

	it('keeps the first route when arrivals are equal', async () => {
		const first = makeRoute('18:40', 40);
		first.routeId = 'first';
		const second = makeRoute('18:40', 40);
		second.routeId = 'second';
		const result = await recommendWith(new ScriptedRouteProvider([first, second]));

		expect(result.recommended.route.routeId).toBe('first');
	});

	it('throws rate-limit from the single lookup', async () => {
		const provider = new ScriptedRouteProvider([], true);

		try {
			await recommendWith(provider);
			expect.fail('should throw');
		} catch (error) {
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).code).toBe(ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT);
		}
	});

	it('does not use a live Kakao snapshot for selection', async () => {
		const live = makeRoute('17:50', 40);
		live.provider = 'kakao';
		const provider: RouteProvider = {
			findLiveRoute: async () => live,
			findRoutes: async () => [makeRoute('18:40', 40)]
		};

		const result = await recommendWith(provider);

		expect(result.liveRoute).toBeUndefined();
		expect(result.recommended.route.provider).toBe('scripted');
	});
});

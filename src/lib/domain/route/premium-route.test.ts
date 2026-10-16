import { displayedRecommendedRoute } from '$lib/domain/recommendation/display-route';
import type { RecommendationResult, RecommendedRoute } from '$lib/domain/recommendation/types';
import { reselectWithoutPremium, routeUsesPremiumTransit } from '$lib/domain/route/premium-route';
import type { TransitRoute } from '$lib/domain/route/route';
import { describe, expect, it } from 'vitest';

function makeRoute(routeName: string, arrivalAt: string): RecommendedRoute {
	const route: TransitRoute = {
		provider: 'gtfs',
		routeId: routeName,
		totalTimeSeconds: 1800,
		movingTimeSeconds: 1500,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: 300,
		transferCount: 0,
		departureAt: '2026-08-29T09:00:00.000Z',
		arrivalAt,
		sections: [
			{
				sequence: 1,
				type: 'subway',
				startPlaceName: '모란',
				endPlaceName: '강남',
				departureAt: '2026-08-29T09:00:00.000Z',
				arrivalAt,
				waitingTimeSeconds: 0,
				routeName
			}
		]
	};

	return {
		departureAt: route.departureAt,
		expectedArrivalAt: route.arrivalAt,
		totalTimeSeconds: route.totalTimeSeconds,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: 300,
		transferCount: 0,
		route,
		chosenTrips: [],
		headwayLoss: null
	};
}

function makeResult(): RecommendationResult {
	const premium = makeRoute('신분당선', '2026-08-29T09:20:00.000Z');
	const local = makeRoute('8호선', '2026-08-29T09:40:00.000Z');
	return {
		id: 'rec_1',
		tripId: 'trip_1',
		recommended: premium,
		criterion: 'earliestArrival',
		mode: 'leaveAfter',
		alternatives: [{ criterion: 'earliestArrival', route: premium }],
		timedRoutes: [premium, local],
		naiveArrivalAt: premium.expectedArrivalAt,
		calculatedAt: premium.departureAt
	};
}

describe('routeUsesPremiumTransit', () => {
	it('matches regional buses and the Shinbundang line only', () => {
		expect(routeUsesPremiumTransit(makeRoute('광역:5001', '2026-08-29T09:20:00.000Z').route)).toBe(
			true
		);
		expect(
			routeUsesPremiumTransit(makeRoute('수도권:신분당선', '2026-08-29T09:20:00.000Z').route)
		).toBe(true);
		expect(routeUsesPremiumTransit(makeRoute('8호선', '2026-08-29T09:40:00.000Z').route)).toBe(
			false
		);
		expect(routeUsesPremiumTransit(makeRoute('GTX-A', '2026-08-29T09:20:00.000Z').route)).toBe(
			false
		);
	});
});

describe('reselectWithoutPremium', () => {
	it('drops premium routes and keeps the earliest remaining arrival', () => {
		const selected = reselectWithoutPremium(makeResult());
		expect(selected?.timedRoutes).toHaveLength(1);
		expect(selected?.recommended.route.routeId).toBe('8호선');
	});

	it('returns null when every route is premium', () => {
		const result = makeResult();
		result.timedRoutes = [result.timedRoutes[0]];
		expect(reselectWithoutPremium(result)).toBeNull();
	});

	it('falls back from a premium AI pick to the affordable winner', () => {
		const shown = displayedRecommendedRoute(makeResult(), 'aiPick', 0, true);
		expect(shown?.route.routeId).toBe('8호선');
	});
});

import {
	buildAiPickPrompt,
	candidateAtIndex,
	summariesFromTimedRoutes
} from '$lib/domain/recommendation/ai-candidates';
import { displayedRecommendedRoute } from '$lib/domain/recommendation/display-route';
import type { RecommendationResult, RecommendedRoute } from '$lib/domain/recommendation/types';
import type { TransitRoute } from '$lib/domain/route/route';
import { describe, expect, it } from 'vitest';

function makeRoute(id: string, walkSeconds: number): RecommendedRoute {
	const route: TransitRoute = {
		provider: 'gtfs',
		routeId: id,
		totalTimeSeconds: 1800,
		movingTimeSeconds: 1500,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: walkSeconds,
		transferCount: 1,
		departureAt: '2026-08-29T09:00:00.000Z',
		arrivalAt: '2026-08-29T09:30:00.000Z',
		sections: [
			{
				sequence: 1,
				type: 'subway',
				startPlaceName: '모란',
				endPlaceName: '잠실',
				departureAt: '2026-08-29T09:00:00.000Z',
				arrivalAt: '2026-08-29T09:30:00.000Z',
				waitingTimeSeconds: 0,
				routeName: '8호선'
			}
		]
	};

	return {
		departureAt: route.departureAt,
		expectedArrivalAt: route.arrivalAt,
		totalTimeSeconds: route.totalTimeSeconds,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: walkSeconds,
		transferCount: 1,
		route,
		chosenTrips: [],
		headwayLoss: null
	};
}

function makeResult(overrides: Partial<RecommendationResult> = {}): RecommendationResult {
	const recommended = makeRoute('fast', 480);
	return {
		id: 'rec_1',
		tripId: 'trip_1',
		recommended,
		criterion: 'earliestArrival',
		mode: 'leaveAfter',
		alternatives: [{ criterion: 'leastWalking', route: makeRoute('walk', 120) }],
		timedRoutes: [recommended, makeRoute('walk', 120)],
		naiveArrivalAt: recommended.expectedArrivalAt,
		calculatedAt: recommended.departureAt,
		...overrides
	};
}

describe('ai candidate summaries', () => {
	it('maps timed routes without section JSON', () => {
		const summaries = summariesFromTimedRoutes([makeRoute('fast', 480)]);
		expect(summaries).toEqual([
			{
				index: 0,
				departureAt: '2026-08-29T09:00:00.000Z',
				arrivalAt: '2026-08-29T09:30:00.000Z',
				totalTimeSeconds: 1800,
				walkingTimeSeconds: 480,
				transferCount: 1,
				lineLabel: '8호선'
			}
		]);
	});

	it('rejects an index outside the candidate list', () => {
		expect(candidateAtIndex(['a', 'b'], 2)).toBeNull();
		expect(candidateAtIndex(['a', 'b'], -1)).toBeNull();
		expect(candidateAtIndex(['a', 'b'], 1)).toBe('b');
	});

	it('asks Claude to pick an existing index in 해요체', () => {
		const prompt = buildAiPickPrompt({
			originName: '모란',
			destinationName: '잠실',
			mode: 'leaveAfter',
			candidates: summariesFromTimedRoutes([makeRoute('fast', 480)])
		});
		expect(prompt).toContain('index 0');
		expect(prompt).toContain('해요체');
		expect(prompt).not.toContain('chosenTrips');
	});
});

describe('displayedRecommendedRoute', () => {
	it('uses the AI timed route when a pick index is ready', () => {
		const result = makeResult();
		const displayed = displayedRecommendedRoute(result, 'aiPick', 1);
		expect(displayed?.route.routeId).toBe('walk');
	});

	it('falls back to the rule winner while AI is still loading', () => {
		const result = makeResult();
		expect(displayedRecommendedRoute(result, 'aiPick', null)?.route.routeId).toBe('fast');
	});
});

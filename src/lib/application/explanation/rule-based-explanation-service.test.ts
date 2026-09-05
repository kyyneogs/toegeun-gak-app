import type {
	ExplanationContext,
	RecommendationExplanation,
	RecommendationResult
} from '$lib/domain/recommendation/types';
import { combineLocalDateAndClock, toIso } from '$lib/utils/time';
import { RuleBasedExplanationService } from '$lib/application/explanation/rule-based-explanation-service';
import type { TransitRoute } from '$lib/domain/route/route';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

function makeResult(routeIds: string[]): RecommendationResult {
	const departure = combineLocalDateAndClock('18:00', DAY);
	const arrival = combineLocalDateAndClock('18:17', DAY);
	const route: TransitRoute = {
		provider: 'gtfs',
		routeId: 'gtfs_1',
		totalTimeSeconds: 17 * 60,
		movingTimeSeconds: 16 * 60,
		waitingTimeSeconds: 60,
		walkingTimeSeconds: 0,
		transferCount: 0,
		departureAt: toIso(departure),
		arrivalAt: toIso(arrival),
		sections: routeIds.map((routeId, index) => ({
			sequence: index + 1,
			type: 'bus',
			startPlaceName: '승차',
			endPlaceName: '하차',
			departureAt: toIso(departure),
			arrivalAt: toIso(arrival),
			waitingTimeSeconds: 0,
			routeId,
			routeName: routeId
		})),
		scheduleSource: 'gtfs',
		chosenTrips: routeIds.map((routeId) => ({
			routeId,
			tripId: `${routeId}_trip`,
			boardTime: toIso(departure),
			alightTime: toIso(arrival)
		}))
	};

	return {
		id: 'rec_1',
		tripId: 'trip_1',
		recommended: {
			departureAt: toIso(departure),
			expectedArrivalAt: toIso(arrival),
			totalTimeSeconds: route.totalTimeSeconds,
			waitingTimeSeconds: 60,
			walkingTimeSeconds: 0,
			transferCount: 0,
			route,
			chosenTrips: route.chosenTrips ?? [],
			headwayLoss: null
		},
		calculatedAt: toIso(departure),
		scheduleSource: 'gtfs',
		criterion: 'earliestArrival',
		mode: 'leaveAfter',
		alternatives: [],
		naiveArrivalAt: toIso(arrival)
	};
}

describe('RuleBasedExplanationService', () => {
	it('puts the chosen bus number in the summary so time changes are visible', async () => {
		const explanation: RecommendationExplanation = await new RuleBasedExplanationService().explain(
			makeResult(['330']),
			{ originName: '판교로 333', destinationName: '여수동 548' } satisfies ExplanationContext
		);

		expect(explanation.summary).toContain('330 타고');
		expect(explanation.summary).toContain('타면');
		expect(explanation.details[0]).toContain('330 타고');
	});

	it('mentions walking time when the recommended route includes a walk', async () => {
		const result = makeResult(['330']);
		result.recommended.walkingTimeSeconds = 8 * 60;
		result.recommended.route.sections = [
			{
				sequence: 1,
				type: 'walk',
				startPlaceName: '회사',
				endPlaceName: '정류장',
				departureAt: result.recommended.departureAt,
				arrivalAt: result.recommended.expectedArrivalAt,
				waitingTimeSeconds: 0
			},
			...result.recommended.route.sections
		];

		const explanation = await new RuleBasedExplanationService().explain(result, {
			originName: '판교로 333',
			destinationName: '여수동 548'
		});

		expect(explanation.summary).toContain('일어나면');
		expect(explanation.details.some((detail) => detail.includes('8분'))).toBe(true);
	});
});

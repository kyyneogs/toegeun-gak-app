import type { DisplayCriterion } from '$lib/domain/recommendation/criteria';
import type { RecommendationResult, RecommendedRoute } from '$lib/domain/recommendation/types';

export function displayedRecommendedRoute(
	result: RecommendationResult,
	selectedCriterion: DisplayCriterion,
	aiRouteIndex: number | null
): RecommendedRoute | null {
	if (selectedCriterion === 'aiPick') {
		if (aiRouteIndex !== null) {
			return result.timedRoutes?.[aiRouteIndex] ?? result.recommended;
		}

		return result.recommended;
	}

	if (selectedCriterion === result.criterion) {
		return result.recommended;
	}

	const alternative = result.alternatives.find((item) => item.criterion === selectedCriterion);
	return alternative?.route ?? result.recommended;
}

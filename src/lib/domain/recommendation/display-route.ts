import type { DisplayCriterion } from '$lib/domain/recommendation/criteria';
import type { RecommendationResult, RecommendedRoute } from '$lib/domain/recommendation/types';
import { reselectWithoutPremium, routeUsesPremiumTransit } from '$lib/domain/route/premium-route';

export function displayedRecommendedRoute(
	result: RecommendationResult,
	selectedCriterion: DisplayCriterion,
	aiRouteIndex: number | null,
	excludePremiumRoutes = false
): RecommendedRoute | null {
	if (excludePremiumRoutes) {
		return displayedRouteWithoutPremium(result, selectedCriterion, aiRouteIndex);
	}

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

function displayedRouteWithoutPremium(
	result: RecommendationResult,
	selectedCriterion: DisplayCriterion,
	aiRouteIndex: number | null
): RecommendedRoute | null {
	const affordable = reselectWithoutPremium(result);

	if (!affordable) {
		return null;
	}

	if (selectedCriterion === 'aiPick') {
		const aiRoute = aiRouteIndex === null ? null : result.timedRoutes[aiRouteIndex];

		if (aiRoute && !routeUsesPremiumTransit(aiRoute.route)) {
			return aiRoute;
		}

		return affordable.recommended;
	}

	return displayedRecommendedRoute(affordable, selectedCriterion, null);
}

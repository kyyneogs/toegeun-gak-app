import {
	alternativesFor,
	selectLatestDeparture,
	selectRouteByCriterion
} from '$lib/domain/recommendation/criteria';
import type { RecommendationResult } from '$lib/domain/recommendation/types';
import type { TransitRoute } from '$lib/domain/route/route';

export const PREMIUM_ROUTE_NAME_MARKERS = ['광역', '신분당'] as const;

export function routeUsesPremiumTransit(route: TransitRoute): boolean {
	const labels: Array<string | undefined> = [route.routeId];

	for (const section of route.sections) {
		labels.push(section.routeId, section.routeName);
	}

	return labels.some((label) =>
		PREMIUM_ROUTE_NAME_MARKERS.some((marker) => label?.includes(marker))
	);
}

export function reselectWithoutPremium(result: RecommendationResult): RecommendationResult | null {
	const timedRoutes = result.timedRoutes.filter((item) => !routeUsesPremiumTransit(item.route));

	if (timedRoutes.length === 0) {
		return null;
	}

	const transitRoutes = timedRoutes.map((item) => item.route);
	const recommendedTransit =
		result.criterion === 'latestDeparture'
			? selectLatestDeparture(transitRoutes)
			: selectRouteByCriterion(transitRoutes, result.criterion);
	const recommended =
		timedRoutes.find((item) => item.route === recommendedTransit) ?? timedRoutes[0];
	const alternatives = alternativesFor(transitRoutes).flatMap((item) => {
		const route = timedRoutes.find((candidate) => candidate.route === item.route);
		return route ? [{ criterion: item.criterion, route }] : [];
	});

	return {
		...result,
		recommended,
		alternatives,
		timedRoutes
	};
}

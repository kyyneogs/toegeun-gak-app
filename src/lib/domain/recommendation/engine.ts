import { SCORE_TIE_EPSILON } from '$lib/constants/recommendation';
import { AppError } from '$lib/domain/errors';
import { ERROR_CODES } from '$lib/constants/errors';
import type { TransitRoute } from '$lib/domain/route/route';
import { assignReasonCodes } from '$lib/domain/recommendation/reasons';
import { scoreCandidate } from '$lib/domain/recommendation/score';
import type { RecommendationResult, ScoredCandidate } from '$lib/domain/recommendation/types';
import { createId } from '$lib/utils/id';
import { fromIso, toIso } from '$lib/utils/time';

export function pickBestRoute(routes: TransitRoute[]): TransitRoute | null {
	if (routes.length === 0) {
		return null;
	}

	return [...routes].sort((left, right) => {
		if (left.totalTimeSeconds !== right.totalTimeSeconds) {
			return left.totalTimeSeconds - right.totalTimeSeconds;
		}

		if (left.transferCount !== right.transferCount) {
			return left.transferCount - right.transferCount;
		}

		return left.waitingTimeSeconds - right.waitingTimeSeconds;
	})[0];
}

export function compareCandidates(left: ScoredCandidate, right: ScoredCandidate): number {
	const scoreDelta = left.score - right.score;

	if (Math.abs(scoreDelta) > SCORE_TIE_EPSILON) {
		return scoreDelta;
	}

	const earlierDeparture =
		fromIso(left.departureAt).getTime() - fromIso(right.departureAt).getTime();

	if (earlierDeparture !== 0) {
		return earlierDeparture;
	}

	if (left.transferCount !== right.transferCount) {
		return left.transferCount - right.transferCount;
	}

	return left.waitingTimeSeconds - right.waitingTimeSeconds;
}

export function buildRecommendation(params: {
	tripId: string;
	windowStart: Date;
	windowEnd: Date;
	desiredArrivalAt?: Date;
	routesByDeparture: TransitRoute[];
	liveRoute?: TransitRoute | null;
}): RecommendationResult {
	const scored: ScoredCandidate[] = [];

	for (const route of params.routesByDeparture) {
		const arrivalAt = fromIso(route.arrivalAt);

		if (params.desiredArrivalAt && arrivalAt.getTime() > params.desiredArrivalAt.getTime()) {
			continue;
		}

		const departureAt = fromIso(route.departureAt);
		const score = scoreCandidate({
			totalTimeSeconds: route.totalTimeSeconds,
			waitingTimeSeconds: route.waitingTimeSeconds,
			transferCount: route.transferCount,
			departureAt,
			windowStart: params.windowStart,
			windowEnd: params.windowEnd
		});

		scored.push({
			departureAt: route.departureAt,
			expectedArrivalAt: route.arrivalAt,
			totalTimeSeconds: route.totalTimeSeconds,
			waitingTimeSeconds: route.waitingTimeSeconds,
			walkingTimeSeconds: route.walkingTimeSeconds,
			transferCount: route.transferCount,
			score,
			route,
			reasonCodes: []
		});
	}

	if (scored.length === 0) {
		throw new AppError(
			params.desiredArrivalAt ? ERROR_CODES.RECOMMENDATION_UNAVAILABLE : ERROR_CODES.ROUTE_NOT_FOUND
		);
	}

	const ranked = [...scored].sort(compareCandidates);
	const recommended = ranked[0];
	const reasonCodes = assignReasonCodes(recommended, scored);
	recommended.reasonCodes = reasonCodes;

	return {
		id: createId('rec'),
		tripId: params.tripId,
		recommended,
		alternatives: [...scored].sort(
			(left, right) => fromIso(left.departureAt).getTime() - fromIso(right.departureAt).getTime()
		),
		reasonCodes,
		calculatedAt: toIso(new Date()),
		liveRoute: params.liveRoute ?? null,
		scheduleSource: recommended.route.scheduleSource
	};
}

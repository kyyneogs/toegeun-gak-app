import type {
	ExplanationContext,
	RecommendationExplanation,
	RecommendationResult
} from '$lib/domain/recommendation/types';
import { scheduleRouteCopy } from '$lib/constants/kakao';
import type { ExplanationService } from '$lib/ports/explanation-service';
import { chosenTripLineLabel, standUpStartsWithWalk } from '$lib/utils/route-label';
import { formatClock, formatDurationMinutes, fromIso } from '$lib/utils/time';

export class RuleBasedExplanationService implements ExplanationService {
	async explain(
		result: RecommendationResult,
		context: ExplanationContext
	): Promise<RecommendationExplanation> {
		const recommended = result.recommended;
		const standupClock = formatClock(fromIso(recommended.departureAt));
		const arrivalClock = formatClock(fromIso(recommended.expectedArrivalAt));
		const travel = formatDurationMinutes(recommended.totalTimeSeconds);
		const line = chosenTripLineLabel(recommended.chosenTrips.map((trip) => trip.routeId));
		const startsWithWalk = standUpStartsWithWalk(recommended.route.sections);
		const standupVerb = startsWithWalk ? '일어나면' : '타면';
		const rideClause = line ? `${line} 타고 ` : '';
		const details: string[] = [
			`${standupClock}에 ${standupVerb} ${rideClause}${arrivalClock}에 도착해요.`,
			`${context.originName}에서 ${context.destinationName}까지 약 ${travel} 걸려요.`
		];

		for (const trip of recommended.chosenTrips) {
			details.push(
				`${trip.routeId} ${formatClock(fromIso(trip.boardTime))}에 타고 ${formatClock(fromIso(trip.alightTime))}에 내려요.`
			);
		}

		if (recommended.walkingTimeSeconds > 0) {
			details.push(
				`걷는 시간은 약 ${formatDurationMinutes(recommended.walkingTimeSeconds)}이에요.`
			);
		}

		details.push(scheduleRouteCopy(result.scheduleSource));

		return {
			summary: `${standupClock}에 ${standupVerb} ${rideClause}${arrivalClock}에 도착해요.`,
			details
		};
	}
}

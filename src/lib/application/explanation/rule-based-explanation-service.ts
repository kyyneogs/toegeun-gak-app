import type {
	ExplanationContext,
	RecommendationExplanation,
	RecommendationResult,
	ScoredCandidate
} from '$lib/domain/recommendation/types';
import { scheduleExplanationCopy } from '$lib/constants/kakao';
import type { ExplanationService } from '$lib/ports/explanation-service';
import { formatClock, formatDurationMinutes, fromIso, minutesBetween } from '$lib/utils/time';

export class RuleBasedExplanationService implements ExplanationService {
	async explain(
		result: RecommendationResult,
		context: ExplanationContext
	): Promise<RecommendationExplanation> {
		const recommended = result.recommended;
		const departureClock = formatClock(fromIso(recommended.departureAt));
		const waitMinutes = Math.round(recommended.waitingTimeSeconds / 60);
		const details: string[] = [
			`${departureClock}에 출발하면 정류장 도착 후 약 ${waitMinutes}분 만에 버스를 탈 수 있습니다.`
		];

		if (result.liveRoute) {
			details.push(scheduleExplanationCopy(result.scheduleSource));
		}

		const comparison = findComparisonCandidate(result.alternatives, recommended);

		if (comparison) {
			const comparisonClock = formatClock(fromIso(comparison.departureAt));
			const comparisonWait = Math.round(comparison.waitingTimeSeconds / 60);
			details.push(
				`${comparisonClock}에 출발하면 다음 버스를 기다리느라 약 ${comparisonWait}분을 기다리게 됩니다.`
			);
		}

		return {
			summary: buildSummary(recommended, comparison, context),
			details
		};
	}
}

function buildSummary(
	recommended: ScoredCandidate,
	comparison: ScoredCandidate | null,
	context: ExplanationContext
): string {
	const departureClock = formatClock(fromIso(recommended.departureAt));
	const travel = formatDurationMinutes(recommended.totalTimeSeconds);

	if (!comparison) {
		return `${departureClock} 출발을 추천합니다. ${context.originName}에서 ${context.destinationName}까지 약 ${travel} 걸립니다.`;
	}

	const laterMinutes = minutesBetween(
		fromIso(comparison.departureAt),
		fromIso(recommended.departureAt)
	);
	const arrivalGain = minutesBetween(
		fromIso(recommended.expectedArrivalAt),
		fromIso(comparison.expectedArrivalAt)
	);

	if (laterMinutes > 0 && arrivalGain > 0) {
		return `${formatClock(fromIso(comparison.departureAt))}보다 ${laterMinutes}분 늦게 나가면 약 ${arrivalGain}분 빨리 도착할 수 있어요.`;
	}

	const waitSaved = Math.round(
		(comparison.waitingTimeSeconds - recommended.waitingTimeSeconds) / 60
	);

	if (laterMinutes > 0 && waitSaved > 0) {
		return `${formatClock(fromIso(comparison.departureAt))}보다 ${laterMinutes}분 더 있다가 나가면 대기가 약 ${waitSaved}분 줄어듭니다.`;
	}

	return `${departureClock} 출발이 대기 시간과 총 이동 시간 기준으로 가장 효율적입니다.`;
}

function findComparisonCandidate(
	alternatives: ScoredCandidate[],
	recommended: ScoredCandidate
): ScoredCandidate | null {
	const earlier = alternatives.filter(
		(candidate) => fromIso(candidate.departureAt) < fromIso(recommended.departureAt)
	);

	if (earlier.length === 0) {
		return null;
	}

	return earlier.reduce((worst, candidate) =>
		candidate.waitingTimeSeconds > worst.waitingTimeSeconds ? candidate : worst
	);
}

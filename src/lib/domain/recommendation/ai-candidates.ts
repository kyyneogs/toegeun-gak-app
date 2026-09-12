import type { RecommendationMode } from '$lib/domain/recommendation/criteria';
import type { RecommendedRoute } from '$lib/domain/recommendation/types';
import { transitLineLabel } from '$lib/utils/route-label';

export interface AiCandidateSummary {
	index: number;
	departureAt: string;
	arrivalAt: string;
	totalTimeSeconds: number;
	walkingTimeSeconds: number;
	transferCount: number;
	lineLabel: string;
}

export interface AiPickContext {
	originName: string;
	destinationName: string;
	mode: RecommendationMode;
	candidates: AiCandidateSummary[];
}

export interface AiPickChoice {
	index: number;
	reason: string;
}

export function summariesFromTimedRoutes(routes: RecommendedRoute[]): AiCandidateSummary[] {
	return routes.map((route, index) => ({
		index,
		departureAt: route.departureAt,
		arrivalAt: route.expectedArrivalAt,
		totalTimeSeconds: route.totalTimeSeconds,
		walkingTimeSeconds: route.walkingTimeSeconds,
		transferCount: route.transferCount,
		lineLabel: transitLineLabel(route.route.sections)
	}));
}

export function candidateAtIndex<T>(candidates: readonly T[], index: number): T | null {
	if (!Number.isInteger(index) || index < 0 || index >= candidates.length) {
		return null;
	}

	return candidates[index] ?? null;
}

export function buildAiPickPrompt(context: AiPickContext): string {
	const modeLine =
		context.mode === 'arriveBy'
			? '사용자는 약속 시각에 맞춰 최대한 늦게 나가려 해요.'
			: '사용자는 이 시각 이후 퇴근해서 빨리 집에 가려 해요.';
	const lines = context.candidates.map((candidate) => {
		const totalMinutes = Math.round(candidate.totalTimeSeconds / 60);
		const walkMinutes = Math.round(candidate.walkingTimeSeconds / 60);
		return [
			`index ${candidate.index}`,
			`노선 ${candidate.lineLabel}`,
			`출발 ${candidate.departureAt}`,
			`도착 ${candidate.arrivalAt}`,
			`총 ${totalMinutes}분`,
			`도보 ${walkMinutes}분`,
			`환승 ${candidate.transferCount}회`
		].join(', ');
	});

	return [
		'퇴근 경로 후보 중에서 지금 가장 나은 하나를 고르세요.',
		`출발지: ${context.originName}`,
		`도착지: ${context.destinationName}`,
		modeLine,
		'시각과 분 숫자는 다시 말하지 마세요. 앱이 보여 줍니다.',
		'index는 아래 목록에 있는 값만 쓰세요.',
		'이유는 해요체로 한 문장만 쓰세요.',
		'후보:',
		...lines
	].join('\n');
}

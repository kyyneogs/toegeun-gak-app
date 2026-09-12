import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { candidateAtIndex, type AiPickChoice } from '$lib/domain/recommendation/ai-candidates';
import type { AiRoutePicker } from '$lib/ports/ai-route-picker';
import {
	loadRecommendationSnapshot,
	saveRecommendationSnapshot,
	withAiPickRoute
} from '$lib/server/recommendation-snapshots';

export async function pickAiRecommendation(
	recommendationId: string,
	picker: AiRoutePicker
): Promise<AiPickChoice> {
	if (!recommendationId.trim()) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const snapshot = await loadRecommendationSnapshot(recommendationId);

	if (!snapshot?.aiCandidates || snapshot.aiCandidates.length === 0) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const choice = await picker.pick({
		originName: snapshot.originName,
		destinationName: snapshot.destinationName,
		mode: snapshot.mode === 'arriveBy' ? 'arriveBy' : 'leaveAfter',
		candidates: snapshot.aiCandidates
	});
	const candidate = candidateAtIndex(snapshot.aiCandidates, choice.index);

	if (!candidate) {
		console.error('AI pick index out of range', { index: choice.index, recommendationId });
		throw new AppError(ERROR_CODES.AI_UNAVAILABLE);
	}

	await saveRecommendationSnapshot(recommendationId, withAiPickRoute(snapshot, choice.index));

	return {
		index: choice.index,
		reason: choice.reason.trim()
	};
}

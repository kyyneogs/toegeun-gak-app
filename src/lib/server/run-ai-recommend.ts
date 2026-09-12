import { env } from '$env/dynamic/private';
import { ERROR_CODES } from '$lib/constants/errors';
import { ClaudeAiRoutePicker } from '$lib/adapters/anthropic/claude-ai-route-picker';
import { pickAiRecommendation } from '$lib/application/recommendation/ai-recommendation-service';
import { AppError } from '$lib/domain/errors';
import type { AiPickChoice } from '$lib/domain/recommendation/ai-candidates';
import type { AiRoutePicker } from '$lib/ports/ai-route-picker';

export async function runServerAiRecommendation(
	recommendationId: string,
	picker: AiRoutePicker = createClaudePicker()
): Promise<AiPickChoice> {
	return pickAiRecommendation(recommendationId, picker);
}

function createClaudePicker(): AiRoutePicker {
	const apiKey = env.ANTHROPIC_API_KEY?.trim() ?? '';

	if (!apiKey) {
		throw new AppError(ERROR_CODES.AI_UNAVAILABLE);
	}

	return new ClaudeAiRoutePicker(apiKey);
}

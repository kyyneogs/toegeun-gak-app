import { AI_PICK_TIMEOUT_MS } from '$lib/constants/persist';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import type { AiPickChoice } from '$lib/domain/recommendation/ai-candidates';

export const RECOMMEND_AI_PATH = '/api/recommend/ai';

export async function fetchAiRoutePick(
	recommendationId: string,
	fetchImpl: typeof fetch = fetch,
	signal: AbortSignal = AbortSignal.timeout(AI_PICK_TIMEOUT_MS)
): Promise<AiPickChoice> {
	let response: Response;

	try {
		response = await fetchImpl(RECOMMEND_AI_PATH, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ recommendationId }),
			signal
		});
	} catch (cause) {
		throw new AppError(ERROR_CODES.AI_UNAVAILABLE, undefined, cause);
	}

	const contentType = response.headers.get('content-type') ?? '';

	if (!contentType.includes('application/json')) {
		throw new AppError(ERROR_CODES.AI_UNAVAILABLE);
	}

	let payload: { index?: number; reason?: string; code?: string; message?: string };

	try {
		payload = (await response.json()) as typeof payload;
	} catch (cause) {
		throw new AppError(ERROR_CODES.AI_UNAVAILABLE, undefined, cause);
	}

	if (!response.ok || typeof payload.index !== 'number' || typeof payload.reason !== 'string') {
		throw new AppError(
			payload.code === ERROR_CODES.INVALID_REQUEST
				? ERROR_CODES.INVALID_REQUEST
				: ERROR_CODES.AI_UNAVAILABLE,
			payload.message
		);
	}

	return { index: payload.index, reason: payload.reason };
}

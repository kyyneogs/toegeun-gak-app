import { json } from '@sveltejs/kit';
import { ERROR_CODES, ERROR_USER_MESSAGES } from '$lib/constants/errors';
import { AI_PICK_MAX_DURATION_SECONDS } from '$lib/constants/persist';
import { jsonError } from '$lib/server/json-error';
import { runServerAiRecommendation } from '$lib/server/run-ai-recommend';

export const config = {
	maxDuration: AI_PICK_MAX_DURATION_SECONDS
};

export async function POST({ request }) {
	let body: unknown;

	try {
		body = await request.json();
	} catch (cause) {
		console.error('AI recommend request JSON parse failed', cause);
		return json(
			{
				code: ERROR_CODES.INVALID_REQUEST,
				message: ERROR_USER_MESSAGES.INVALID_REQUEST
			},
			{ status: 400 }
		);
	}

	const recommendationId =
		typeof body === 'object' &&
		body !== null &&
		'recommendationId' in body &&
		typeof body.recommendationId === 'string'
			? body.recommendationId.trim()
			: '';

	if (!recommendationId) {
		return json(
			{
				code: ERROR_CODES.INVALID_REQUEST,
				message: ERROR_USER_MESSAGES.INVALID_REQUEST
			},
			{ status: 400 }
		);
	}

	try {
		const pick = await runServerAiRecommendation(recommendationId);
		return json(pick);
	} catch (cause) {
		console.error('AI recommend failed', cause);
		return jsonError(cause);
	}
}

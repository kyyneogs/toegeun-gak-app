import { ERROR_CODES, ERROR_USER_MESSAGES, type ErrorCode } from '$lib/constants/errors';
import { AppError, isAppError } from '$lib/domain/errors';
import {
	isRecommendProgressStage,
	type RecommendProgressStage
} from '$lib/domain/recommendation/progress';
import type { RecommendationResult } from '$lib/domain/recommendation/types';

export type RecommendStreamEvent =
	| { type: 'progress'; stage: RecommendProgressStage }
	| { type: 'result'; result: RecommendationResult }
	| { type: 'error'; code: string; message: string };

export function encodeRecommendStreamEvent(event: RecommendStreamEvent): string {
	return `${JSON.stringify(event)}\n`;
}

export function recommendErrorEvent(
	cause: unknown
): Extract<RecommendStreamEvent, { type: 'error' }> {
	if (isAppError(cause)) {
		return { type: 'error', code: cause.code, message: cause.message };
	}

	return {
		type: 'error',
		code: ERROR_CODES.ROUTE_PROVIDER_TIMEOUT,
		message: ERROR_USER_MESSAGES.ROUTE_PROVIDER_TIMEOUT
	};
}

export function parseRecommendStreamEvent(line: string): RecommendStreamEvent | null {
	if (!line.trim()) {
		return null;
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(line) as unknown;
	} catch {
		return null;
	}

	if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
		return null;
	}

	if (parsed.type === 'progress' && 'stage' in parsed && typeof parsed.stage === 'string') {
		if (!isRecommendProgressStage(parsed.stage) || parsed.stage === 'aiPicking') {
			return null;
		}

		return { type: 'progress', stage: parsed.stage };
	}

	if (
		parsed.type === 'result' &&
		'result' in parsed &&
		parsed.result &&
		typeof parsed.result === 'object'
	) {
		return { type: 'result', result: parsed.result as RecommendationResult };
	}

	if (
		parsed.type === 'error' &&
		'code' in parsed &&
		typeof parsed.code === 'string' &&
		'message' in parsed &&
		typeof parsed.message === 'string'
	) {
		return { type: 'error', code: parsed.code, message: parsed.message };
	}

	return null;
}

export function errorFromRecommendStream(
	event: Extract<RecommendStreamEvent, { type: 'error' }>
): AppError {
	const code = event.code as ErrorCode;
	const mapped =
		code === ERROR_CODES.RECOMMENDATION_UNAVAILABLE
			? ERROR_CODES.RECOMMENDATION_UNAVAILABLE
			: code === ERROR_CODES.ROUTE_NOT_FOUND
				? ERROR_CODES.ROUTE_NOT_FOUND
				: code === ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT
					? ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT
					: ERROR_CODES.ROUTE_PROVIDER_TIMEOUT;

	return new AppError(mapped, event.message);
}

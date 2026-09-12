import { ERROR_CODES } from '$lib/constants/errors';
import { ROUTE_SEARCH_TIMEOUT_MS, ROUTE_TIMING_TIMEOUT_MS } from '$lib/constants/persist';
import { AppError } from '$lib/domain/errors';
import type { RecommendationInput, RecommendationResult } from '$lib/domain/recommendation/types';
import type { RecommendOptions, RecommendationService } from '$lib/ports/recommendation-service';
import {
	errorFromRecommendStream,
	parseRecommendStreamEvent
} from '$lib/adapters/http/recommend-stream';

export const RECOMMEND_SEARCH_PATH = '/api/recommend';

export interface RecommendApiResponse extends Partial<RecommendationResult> {
	code?: string;
	message?: string;
}

export class HttpRecommendationService implements RecommendationService {
	constructor(private readonly fetchImpl: typeof fetch = fetch) {}

	async recommend(
		input: RecommendationInput,
		options?: RecommendOptions
	): Promise<RecommendationResult> {
		const abort =
			options?.signal ?? AbortSignal.timeout(ROUTE_SEARCH_TIMEOUT_MS + ROUTE_TIMING_TIMEOUT_MS);
		let response: Response;

		try {
			response = await this.fetchImpl(RECOMMEND_SEARCH_PATH, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/x-ndjson, application/json'
				},
				body: JSON.stringify({
					origin: {
						name: input.trip.origin.name,
						latitude: input.trip.origin.latitude,
						longitude: input.trip.origin.longitude
					},
					destination: {
						name: input.trip.destination.name,
						latitude: input.trip.destination.latitude,
						longitude: input.trip.destination.longitude
					},
					departureFrom: input.trip.departureFrom,
					desiredArrivalAt: input.trip.desiredArrivalAt,
					criterion: input.criterion
				}),
				signal: abort
			});
		} catch (cause) {
			throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT, undefined, cause);
		}

		const contentType = response.headers.get('content-type') ?? '';

		if (contentType.includes('application/x-ndjson')) {
			return readNdjsonResult(response, options);
		}

		const payload = await readPayload(response);

		if (response.status === 429) {
			throw new AppError(ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT, payload.message);
		}

		if (!response.ok || !payload.recommended) {
			throw new AppError(
				payload.code === ERROR_CODES.RECOMMENDATION_UNAVAILABLE
					? ERROR_CODES.RECOMMENDATION_UNAVAILABLE
					: payload.code === ERROR_CODES.ROUTE_NOT_FOUND
						? ERROR_CODES.ROUTE_NOT_FOUND
						: ERROR_CODES.ROUTE_PROVIDER_TIMEOUT,
				payload.message
			);
		}

		return payload as RecommendationResult;
	}
}

async function readNdjsonResult(
	response: Response,
	options?: RecommendOptions
): Promise<RecommendationResult> {
	if (!response.body) {
		throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let result: RecommendationResult | null = null;

	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';

		for (const line of lines) {
			const event = parseRecommendStreamEvent(line);

			if (!event) {
				continue;
			}

			if (event.type === 'progress') {
				options?.onProgress?.(event.stage);
				continue;
			}

			if (event.type === 'error') {
				throw errorFromRecommendStream(event);
			}

			result = event.result;
		}
	}

	if (buffer.trim()) {
		const event = parseRecommendStreamEvent(buffer);

		if (event?.type === 'progress') {
			options?.onProgress?.(event.stage);
		} else if (event?.type === 'error') {
			throw errorFromRecommendStream(event);
		} else if (event?.type === 'result') {
			result = event.result;
		}
	}

	if (!result?.recommended) {
		throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT);
	}

	return result;
}

async function readPayload(response: Response): Promise<RecommendApiResponse> {
	const contentType = response.headers.get('content-type') ?? '';

	if (!contentType.includes('application/json')) {
		throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT);
	}

	try {
		return (await response.json()) as RecommendApiResponse;
	} catch (cause) {
		throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT, undefined, cause);
	}
}

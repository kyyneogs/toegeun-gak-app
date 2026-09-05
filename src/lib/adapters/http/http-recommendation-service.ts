import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import type { RecommendationInput, RecommendationResult } from '$lib/domain/recommendation/types';
import type { RecommendationService } from '$lib/ports/recommendation-service';

export const RECOMMEND_SEARCH_PATH = '/api/recommend';

export interface RecommendApiResponse extends Partial<RecommendationResult> {
	code?: string;
	message?: string;
}

export class HttpRecommendationService implements RecommendationService {
	constructor(private readonly fetchImpl: typeof fetch = fetch) {}

	async recommend(input: RecommendationInput): Promise<RecommendationResult> {
		let response: Response;

		try {
			response = await this.fetchImpl(RECOMMEND_SEARCH_PATH, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
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
				})
			});
		} catch (cause) {
			throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT, undefined, cause);
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

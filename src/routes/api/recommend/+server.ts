import { json } from '@sveltejs/kit';
import { parseRecommendRequest } from '$lib/adapters/http/recommend-request';
import { ERROR_CODES, ERROR_USER_MESSAGES } from '$lib/constants/errors';
import { RECOMMEND_MAX_DURATION_SECONDS } from '$lib/constants/persist';
import { isAppError } from '$lib/domain/errors';
import { runServerRecommendation } from '$lib/server/run-recommend';

export const config = {
	maxDuration: RECOMMEND_MAX_DURATION_SECONDS
};

export async function POST({ request }) {
	let body: unknown;

	try {
		body = await request.json();
	} catch (cause) {
		console.error('Recommend request JSON parse failed', cause);
		return json(
			{
				code: ERROR_CODES.INVALID_REQUEST,
				message: ERROR_USER_MESSAGES.INVALID_REQUEST
			},
			{ status: 400 }
		);
	}

	const parsed = parseRecommendRequest(body);

	if (!parsed) {
		return json(
			{
				code: ERROR_CODES.INVALID_REQUEST,
				message: ERROR_USER_MESSAGES.INVALID_REQUEST
			},
			{ status: 400 }
		);
	}

	try {
		const result = await runServerRecommendation({
			originName: parsed.origin.name,
			originLatitude: parsed.origin.latitude,
			originLongitude: parsed.origin.longitude,
			destinationName: parsed.destination.name,
			destinationLatitude: parsed.destination.latitude,
			destinationLongitude: parsed.destination.longitude,
			departureFrom: parsed.departureFrom,
			desiredArrivalAt: parsed.desiredArrivalAt,
			criterion: parsed.criterion
		});
		return json(result);
	} catch (cause) {
		console.error('Recommend failed', cause);

		if (isAppError(cause) && cause.code === ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT) {
			return json(
				{
					code: cause.code,
					message: ERROR_USER_MESSAGES.ROUTE_PROVIDER_RATE_LIMIT
				},
				{ status: 429 }
			);
		}

		if (isAppError(cause) && cause.code === ERROR_CODES.RECOMMENDATION_UNAVAILABLE) {
			return json(
				{
					code: cause.code,
					message: cause.message
				},
				{ status: 404 }
			);
		}

		if (isAppError(cause) && cause.code === ERROR_CODES.ROUTE_NOT_FOUND) {
			return json(
				{
					code: cause.code,
					message: cause.message
				},
				{ status: 404 }
			);
		}

		const code = isAppError(cause) ? cause.code : ERROR_CODES.ROUTE_PROVIDER_TIMEOUT;

		return json(
			{
				code,
				message: ERROR_USER_MESSAGES[code] ?? ERROR_USER_MESSAGES.ROUTE_PROVIDER_TIMEOUT
			},
			{ status: 502 }
		);
	}
}

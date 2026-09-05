import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { parseTransitRequest, isLiveOnlyTransitRequest } from '$lib/adapters/http/transit-request';
import { getServerKakaoRouteProvider } from '$lib/adapters/kakao/kakao-server';
import { ERROR_CODES, ERROR_USER_MESSAGES } from '$lib/constants/errors';
import { isKakaoRestKeyConfigured } from '$lib/constants/kakao';
import { serverGtfsDirectory } from '$lib/constants/gtfs-paths';
import { isAppError } from '$lib/domain/errors';

export async function POST({ request }) {
	const restKey = env.KAKAO_REST_API_KEY?.trim() ?? '';

	if (!isKakaoRestKeyConfigured(restKey)) {
		return json(
			{
				code: 'UNCONFIGURED',
				message: ERROR_USER_MESSAGES.ROUTE_NOT_FOUND
			},
			{ status: 503 }
		);
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch (cause) {
		console.error('Transit request JSON parse failed', cause);
		return json(
			{
				code: ERROR_CODES.INVALID_REQUEST,
				message: ERROR_USER_MESSAGES.INVALID_REQUEST
			},
			{ status: 400 }
		);
	}

	const routeRequest = parseTransitRequest(body);

	if (!routeRequest) {
		return json(
			{
				code: ERROR_CODES.INVALID_REQUEST,
				message: ERROR_USER_MESSAGES.INVALID_REQUEST
			},
			{ status: 400 }
		);
	}

	try {
		const gtfsDir = serverGtfsDirectory(env.GTFS_DIR);
		const provider = getServerKakaoRouteProvider(restKey, gtfsDir);
		const liveOnly = isLiveOnlyTransitRequest(body);
		const liveRoute = await provider.findLiveRoute(routeRequest);

		if (liveOnly) {
			return json({ liveRoute, routes: [] });
		}

		let routes;

		try {
			routes = await provider.findRoutes(routeRequest);
		} catch (cause) {
			if (isAppError(cause) && cause.code === ERROR_CODES.ROUTE_NOT_FOUND) {
				return json({
					liveRoute,
					routes: [],
					code: cause.code,
					message: cause.message
				});
			}

			throw cause;
		}

		return json({ liveRoute, routes });
	} catch (cause) {
		console.error('Transit search failed', cause);

		if (isAppError(cause) && cause.code === ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT) {
			return json(
				{
					code: cause.code,
					message: ERROR_USER_MESSAGES.ROUTE_PROVIDER_RATE_LIMIT
				},
				{ status: 429 }
			);
		}

		if (isAppError(cause) && cause.code === ERROR_CODES.NETWORK_ERROR) {
			return json(
				{
					code: cause.code,
					message: ERROR_USER_MESSAGES.NETWORK_ERROR
				},
				{ status: 502 }
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

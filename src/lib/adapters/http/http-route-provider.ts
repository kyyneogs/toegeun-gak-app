import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import type { RouteRequest, TransitRoute } from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import { placePairKey } from '$lib/utils/geo';

export const TRANSIT_STATUS_PATH = '/api/transit/status';
export const TRANSIT_SEARCH_PATH = '/api/transit';

export interface TransitStatusResponse {
	configured: boolean;
}

export interface TransitSearchResponse {
	routes?: TransitRoute[];
	liveRoute?: TransitRoute | null;
	code?: string;
	message?: string;
}

export async function fetchTransitStatus(
	fetchImpl: typeof fetch = fetch
): Promise<TransitStatusResponse> {
	const response = await fetchImpl(TRANSIT_STATUS_PATH);

	if (!response.ok) {
		throw new AppError(ERROR_CODES.NETWORK_ERROR);
	}

	const payload = (await response.json()) as TransitStatusResponse;
	return { configured: Boolean(payload.configured) };
}

export class HttpRouteProvider implements RouteProvider {
	private readonly liveRoutes = new Map<string, TransitRoute | null>();

	constructor(private readonly fetchImpl: typeof fetch = fetch) {}

	async findLiveRoute(
		request: Pick<RouteRequest, 'origin' | 'destination'>
	): Promise<TransitRoute | null> {
		const key = placePairKey(request.origin, request.destination);
		const cached = this.liveRoutes.get(key);

		if (cached !== undefined) {
			return cached;
		}

		const payload = await this.postSearch({
			origin: request.origin,
			destination: request.destination,
			departureAt: new Date(),
			liveOnly: true
		});
		const liveRoute = payload.liveRoute ?? null;
		this.liveRoutes.set(key, liveRoute);
		return liveRoute;
	}

	async findRoutes(request: RouteRequest): Promise<TransitRoute[]> {
		const payload = await this.postSearch(request);
		this.liveRoutes.set(
			placePairKey(request.origin, request.destination),
			payload.liveRoute ?? null
		);
		const routes = payload.routes ?? [];

		if (routes.length === 0) {
			throw new AppError(ERROR_CODES.ROUTE_NOT_FOUND, payload.message);
		}

		return routes;
	}

	private async postSearch(
		request: RouteRequest & { liveOnly?: boolean }
	): Promise<TransitSearchResponse> {
		let response: Response;

		try {
			response = await this.fetchImpl(TRANSIT_SEARCH_PATH, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					origin: request.origin,
					destination: request.destination,
					departureAt: request.departureAt.toISOString(),
					liveOnly: request.liveOnly === true ? true : undefined
				})
			});
		} catch (cause) {
			throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT, undefined, cause);
		}

		const payload = await readSearchPayload(response);

		if (response.status === 429) {
			throw new AppError(ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT);
		}

		if (!response.ok) {
			if (payload.code === ERROR_CODES.NETWORK_ERROR) {
				throw new AppError(ERROR_CODES.NETWORK_ERROR);
			}

			throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT);
		}

		return payload;
	}
}

async function readSearchPayload(response: Response): Promise<TransitSearchResponse> {
	try {
		return (await response.json()) as TransitSearchResponse;
	} catch (cause) {
		throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT, undefined, cause);
	}
}

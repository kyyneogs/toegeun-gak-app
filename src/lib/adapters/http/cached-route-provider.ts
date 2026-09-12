import type { RouteRequest, RouteSearchOptions, TransitRoute } from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import { placePairKey, toMinuteStamp } from '$lib/utils/geo';

export function buildRouteCacheKey(request: RouteRequest): string {
	return `${placePairKey(request.origin, request.destination)}:${toMinuteStamp(request.departureAt)}`;
}

export class MemoryCachedRouteProvider implements RouteProvider {
	private readonly cache = new Map<string, Promise<TransitRoute[]>>();

	constructor(private readonly inner: RouteProvider) {}

	findRoutes(request: RouteRequest, options?: RouteSearchOptions): Promise<TransitRoute[]> {
		const key = buildRouteCacheKey(request);
		const existing = this.cache.get(key);

		if (existing) {
			options?.onProgress?.('searchingRoutes');
			options?.onProgress?.('routesFound');
			options?.onProgress?.('timingRoutes');
			return existing;
		}

		const pending = this.inner.findRoutes(request, options).catch((cause) => {
			this.cache.delete(key);
			throw cause;
		});

		this.cache.set(key, pending);
		return pending;
	}

	async findLiveRoute(
		request: Pick<RouteRequest, 'origin' | 'destination'>
	): Promise<TransitRoute | null> {
		if (!this.inner.findLiveRoute) {
			return null;
		}

		return this.inner.findLiveRoute(request);
	}
}

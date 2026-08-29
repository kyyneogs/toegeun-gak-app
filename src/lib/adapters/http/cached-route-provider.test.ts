import { MemoryCachedRouteProvider } from '$lib/adapters/http/cached-route-provider';
import type { RouteRequest, TransitRoute } from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import { describe, expect, it } from 'vitest';

class CountingRouteProvider implements RouteProvider {
	calls = 0;

	async findRoutes(request: RouteRequest): Promise<TransitRoute[]> {
		this.calls += 1;
		return [
			{
				provider: 'scripted',
				routeId: 'one',
				totalTimeSeconds: 60,
				movingTimeSeconds: 60,
				waitingTimeSeconds: 0,
				walkingTimeSeconds: 0,
				transferCount: 0,
				departureAt: request.departureAt.toISOString(),
				arrivalAt: request.departureAt.toISOString(),
				sections: []
			}
		];
	}
}

class FailingRouteProvider implements RouteProvider {
	calls = 0;

	async findRoutes(): Promise<TransitRoute[]> {
		this.calls += 1;
		throw new Error('429');
	}
}

describe('MemoryCachedRouteProvider', () => {
	it('reuses in-flight and completed lookups for the same slot', async () => {
		const inner = new CountingRouteProvider();
		const cached = new MemoryCachedRouteProvider(inner);
		const request = {
			origin: { name: 'A', latitude: 37.497952, longitude: 127.027619 },
			destination: { name: 'B', latitude: 37.500622, longitude: 127.036456 },
			departureAt: new Date(2026, 7, 29, 18, 10, 0, 0)
		};

		const [first, second] = await Promise.all([
			cached.findRoutes(request),
			cached.findRoutes(request)
		]);
		const third = await cached.findRoutes(request);

		expect(inner.calls).toBe(1);
		expect(first[0]?.routeId).toBe('one');
		expect(second[0]?.routeId).toBe('one');
		expect(third[0]?.routeId).toBe('one');
	});

	it('does not cache a failed lookup', async () => {
		const inner = new FailingRouteProvider();
		const cached = new MemoryCachedRouteProvider(inner);
		const request = {
			origin: { name: 'A', latitude: 37.497952, longitude: 127.027619 },
			destination: { name: 'B', latitude: 37.500622, longitude: 127.036456 },
			departureAt: new Date(2026, 7, 29, 18, 10, 0, 0)
		};

		await expect(cached.findRoutes(request)).rejects.toThrow('429');
		await expect(cached.findRoutes(request)).rejects.toThrow('429');
		expect(inner.calls).toBe(2);
	});
});

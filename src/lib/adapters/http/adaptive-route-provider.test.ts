import { AdaptiveRouteProvider } from '$lib/adapters/http/adaptive-route-provider';
import type { RouteRequest, TransitRoute } from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import { describe, expect, it } from 'vitest';

class NamedRouteProvider implements RouteProvider {
	constructor(private readonly provider: string) {}

	async findRoutes(request: RouteRequest): Promise<TransitRoute[]> {
		return [
			{
				provider: this.provider,
				routeId: this.provider,
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

const REQUEST = {
	origin: { name: 'A', latitude: 1, longitude: 2 },
	destination: { name: 'B', latitude: 3, longitude: 4 },
	departureAt: new Date('2026-08-29T09:00:00.000Z')
};

describe('AdaptiveRouteProvider', () => {
	it('uses the live provider when Kakao REST is configured', async () => {
		const adaptive = new AdaptiveRouteProvider(
			new NamedRouteProvider('kakao'),
			new NamedRouteProvider('mock'),
			async () => ({ configured: true })
		);

		const routes = await adaptive.findRoutes(REQUEST);
		expect(routes[0]?.provider).toBe('kakao');
	});

	it('uses mock routes when Kakao REST is not configured', async () => {
		const adaptive = new AdaptiveRouteProvider(
			new NamedRouteProvider('kakao'),
			new NamedRouteProvider('mock'),
			async () => ({ configured: false })
		);

		const routes = await adaptive.findRoutes(REQUEST);
		expect(routes[0]?.provider).toBe('mock');
	});
});

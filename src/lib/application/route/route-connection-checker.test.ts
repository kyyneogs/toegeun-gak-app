import { RouteConnectionChecker } from '$lib/application/route/route-connection-checker';
import { ERROR_CODES } from '$lib/constants/errors';
import {
	KAKAO_ROUTE_CONNECTED_MESSAGE,
	KAKAO_ROUTE_KEY_CONFIGURED_MESSAGE,
	KAKAO_ROUTE_MOCK_CONNECTION_MESSAGE
} from '$lib/constants/kakao';
import { AppError } from '$lib/domain/errors';
import type { TransitRoute } from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import { describe, expect, it } from 'vitest';

class StubRouteProvider implements RouteProvider {
	calls = 0;

	constructor(
		private readonly routes: TransitRoute[],
		private readonly failure?: Error
	) {}

	async findRoutes(): Promise<TransitRoute[]> {
		this.calls += 1;
		if (this.failure) {
			throw this.failure;
		}

		return this.routes;
	}
}

const SAMPLE_ROUTE: TransitRoute = {
	provider: 'kakao',
	routeId: 'kakao_0',
	totalTimeSeconds: 600,
	movingTimeSeconds: 600,
	waitingTimeSeconds: 0,
	walkingTimeSeconds: 120,
	transferCount: 0,
	departureAt: '2026-08-29T09:00:00.000Z',
	arrivalAt: '2026-08-29T09:10:00.000Z',
	sections: [
		{
			sequence: 1,
			type: 'bus',
			startPlaceName: '강남역',
			endPlaceName: '역삼역',
			departureAt: '2026-08-29T09:00:00.000Z',
			arrivalAt: '2026-08-29T09:10:00.000Z',
			waitingTimeSeconds: 0,
			routeName: '간선:400'
		}
	]
};

describe('RouteConnectionChecker', () => {
	it('reports mock mode when Kakao REST is not configured', async () => {
		const live = new StubRouteProvider([]);
		const checker = new RouteConnectionChecker(async () => ({ configured: false }), live);
		const result = await checker.check();

		expect(result.ok).toBe(true);
		expect(result.backend).toBe('mock');
		expect(result.message).toBe(KAKAO_ROUTE_MOCK_CONNECTION_MESSAGE);
		expect(live.calls).toBe(0);
	});

	it('does not probe Kakao when only status is requested', async () => {
		const live = new StubRouteProvider([SAMPLE_ROUTE]);
		const checker = new RouteConnectionChecker(async () => ({ configured: true }), live);
		const result = await checker.check();

		expect(result.ok).toBe(true);
		expect(result.backend).toBe('kakao');
		expect(result.verified).toBe(false);
		expect(result.message).toBe(KAKAO_ROUTE_KEY_CONFIGURED_MESSAGE);
		expect(live.calls).toBe(0);
	});

	it('reports Kakao success with a sample route name after a probe', async () => {
		const checker = new RouteConnectionChecker(
			async () => ({ configured: true }),
			new StubRouteProvider([SAMPLE_ROUTE])
		);
		const result = await checker.check({ probe: true });

		expect(result.ok).toBe(true);
		expect(result.backend).toBe('kakao');
		expect(result.verified).toBe(true);
		expect(result.sampleRouteName).toBe('간선:400');
		expect(result.message).toBe(KAKAO_ROUTE_CONNECTED_MESSAGE);
	});

	it('reports a network failure without blaming the app key', async () => {
		const checker = new RouteConnectionChecker(
			async () => ({ configured: true }),
			new StubRouteProvider([], new AppError(ERROR_CODES.NETWORK_ERROR))
		);
		const result = await checker.check({ probe: true });

		expect(result.ok).toBe(false);
		expect(result.message).toContain('Kakao 서버');
		expect(result.message).not.toContain('KAKAO_REST_API_KEY');
	});

	it('hides provider internals on failure', async () => {
		const checker = new RouteConnectionChecker(
			async () => ({ configured: true }),
			new StubRouteProvider([], new Error('secret boom'))
		);
		const result = await checker.check({ probe: true });

		expect(result.ok).toBe(false);
		expect(result.message).not.toContain('secret');
	});
});

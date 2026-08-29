import { HttpRouteProvider } from '$lib/adapters/http/http-route-provider';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { describe, expect, it } from 'vitest';

const REQUEST = {
	origin: { name: '강남역', latitude: 37.49, longitude: 127.02 },
	destination: { name: '역삼역', latitude: 37.5, longitude: 127.03 },
	departureAt: new Date('2026-08-29T09:10:00.000Z')
};

describe('HttpRouteProvider', () => {
	it('returns domain routes from the local transit API', async () => {
		const fetchImpl: typeof fetch = async (input, init) => {
			expect(String(input)).toBe('/api/transit');
			expect(init?.method).toBe('POST');
			return new Response(
				JSON.stringify({
					routes: [
						{
							provider: 'kakao',
							routeId: 'kakao_0',
							totalTimeSeconds: 600,
							movingTimeSeconds: 600,
							waitingTimeSeconds: 0,
							walkingTimeSeconds: 120,
							transferCount: 0,
							departureAt: REQUEST.departureAt.toISOString(),
							arrivalAt: REQUEST.departureAt.toISOString(),
							sections: []
						}
					]
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		};

		const routes = await new HttpRouteProvider(fetchImpl).findRoutes(REQUEST);
		expect(routes).toHaveLength(1);
		expect(routes[0]?.provider).toBe('kakao');
	});

	it('maps 502 network failures from the local proxy', async () => {
		const fetchImpl: typeof fetch = async () =>
			new Response(JSON.stringify({ code: ERROR_CODES.NETWORK_ERROR, message: 'secret dns' }), {
				status: 502
			});

		try {
			await new HttpRouteProvider(fetchImpl).findRoutes(REQUEST);
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.NETWORK_ERROR);
			expect((error as Error).message).not.toContain('secret');
		}
	});

	it('maps 429 without exposing the response body', async () => {
		const fetchImpl: typeof fetch = async () =>
			new Response(JSON.stringify({ message: 'secret quota' }), { status: 429 });

		try {
			await new HttpRouteProvider(fetchImpl).findRoutes(REQUEST);
			expect.fail('should throw');
		} catch (error) {
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).code).toBe(ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT);
			expect((error as Error).message).not.toContain('secret');
		}
	});
});

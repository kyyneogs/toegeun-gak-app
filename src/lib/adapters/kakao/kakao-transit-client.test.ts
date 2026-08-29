import { createKakaoTransitClient } from '$lib/adapters/kakao/kakao-transit-client';
import { KAKAO_PUBLICTRAFFIC_URL } from '$lib/constants/kakao';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGIN = { latitude: 37.39477123, longitude: 127.11119217 };
const DESTINATION = { latitude: 37.41993056, longitude: 127.12628814 };

describe('createKakaoTransitClient', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});
	it('requests coordinates without putting the key in the query', async () => {
		const fetchImpl: typeof fetch = async (input, init) => {
			const url = new URL(String(input));
			expect(url.origin + url.pathname).toBe(KAKAO_PUBLICTRAFFIC_URL);
			expect(url.searchParams.get('start_x')).toBe('127.11119217');
			expect(url.searchParams.get('start_y')).toBe('37.39477123');
			expect(url.search).not.toContain('secret-key');
			expect((init?.headers as Record<string, string>).Authorization).toBe('KakaoAK secret-key');

			return new Response(JSON.stringify({ status: 'OK', routes: [] }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		};

		const payload = await createKakaoTransitClient('secret-key', fetchImpl).search(
			ORIGIN,
			DESTINATION
		);
		expect(payload.status).toBe('OK');
	});

	it('maps HTTP failures without exposing the body', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchImpl: typeof fetch = async () => new Response('secret boom', { status: 403 });

		try {
			await createKakaoTransitClient('secret-key', fetchImpl).search(ORIGIN, DESTINATION);
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT);
			expect((error as Error).message).not.toContain('secret');
		}
	});
});

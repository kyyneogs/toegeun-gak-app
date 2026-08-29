import { KakaoPlaceProvider } from '$lib/adapters/kakao/kakao-place-provider';
import type { KakaoPlacesClient } from '$lib/adapters/kakao/kakao-places-sdk';
import { describe, expect, it } from 'vitest';

const GANGNAM_DOCUMENT = {
	id: '21160804',
	place_name: '강남역 2호선',
	address_name: '서울 강남구 역삼동 858',
	road_address_name: '서울 강남구 강남대로 396',
	x: '127.027619',
	y: '37.497952'
};

describe('KakaoPlaceProvider', () => {
	it('returns mapped places from the Kakao client', async () => {
		const client: KakaoPlacesClient = {
			keywordSearch: async () => [GANGNAM_DOCUMENT]
		};
		const provider = new KakaoPlaceProvider('test-key', client);
		const places = await provider.search('강남');

		expect(places).toHaveLength(1);
		expect(places[0]?.name).toBe('강남역 2호선');
		expect(places[0]?.provider).toBe('kakao');
		expect(places[0]?.latitude).toBe(37.497952);
	});

	it('returns an empty list when Kakao finds nothing', async () => {
		const client: KakaoPlacesClient = {
			keywordSearch: async () => []
		};
		const provider = new KakaoPlaceProvider('test-key', client);

		await expect(provider.search('없는장소')).resolves.toEqual([]);
	});

	it('propagates SDK failures', async () => {
		const client: KakaoPlacesClient = {
			keywordSearch: async () => {
				throw new Error('Kakao place search failed: ERROR');
			}
		};
		const provider = new KakaoPlaceProvider('test-key', client);

		await expect(provider.search('강남')).rejects.toThrow('Kakao place search failed');
	});
});

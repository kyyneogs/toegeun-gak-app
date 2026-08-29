import type { KakaoPlaceDocument } from '$lib/adapters/kakao/kakao-place-document';
import { mapKakaoPlace, mapKakaoPlaces } from '$lib/adapters/kakao/kakao-place-mapper';
import { describe, expect, it } from 'vitest';

const NOW = new Date('2026-08-29T04:00:00.000Z');

const GANGNAM: KakaoPlaceDocument = {
	id: '21160804',
	place_name: '강남역 2호선',
	address_name: '서울 강남구 역삼동 858',
	road_address_name: '서울 강남구 강남대로 396',
	x: '127.027619',
	y: '37.497952'
};

describe('mapKakaoPlace', () => {
	it('maps a Kakao document onto the internal Place model', () => {
		const place = mapKakaoPlace(GANGNAM, NOW);

		expect(place).toEqual({
			id: 'kakao_21160804',
			name: '강남역 2호선',
			address: '서울 강남구 강남대로 396',
			latitude: 37.497952,
			longitude: 127.027619,
			provider: 'kakao',
			providerPlaceId: '21160804',
			createdAt: NOW.toISOString(),
			updatedAt: NOW.toISOString()
		});
	});

	it('falls back to jibun address when road address is empty', () => {
		const place = mapKakaoPlace({ ...GANGNAM, road_address_name: '' }, NOW);

		expect(place?.address).toBe('서울 강남구 역삼동 858');
	});

	it('returns null for invalid coordinates', () => {
		expect(mapKakaoPlace({ ...GANGNAM, x: 'not-a-number', y: '37.4' }, NOW)).toBeNull();
	});
});

describe('mapKakaoPlaces', () => {
	it('drops unusable documents', () => {
		const places = mapKakaoPlaces(
			[GANGNAM, { ...GANGNAM, id: '', place_name: '' }, { ...GANGNAM, y: 'bad' }],
			NOW
		);

		expect(places).toHaveLength(1);
		expect(places[0].providerPlaceId).toBe('21160804');
	});
});

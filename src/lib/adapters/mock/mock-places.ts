import type { Place } from '$lib/domain/place/place';

const FIXED_TIMESTAMP = '2026-01-01T00:00:00.000Z';

function createMockPlace(
	id: string,
	name: string,
	address: string,
	latitude: number,
	longitude: number
): Place {
	return {
		id,
		name,
		address,
		latitude,
		longitude,
		provider: 'mock',
		providerPlaceId: id,
		createdAt: FIXED_TIMESTAMP,
		updatedAt: FIXED_TIMESTAMP
	};
}

export const COMPANY_PLACE = createMockPlace(
	'place_company',
	'회사',
	'경기도 성남시 분당구 판교역로 166',
	37.394727,
	127.110153
);

export const GANGNAM_STATION = createMockPlace(
	'place_gangnam',
	'강남역',
	'서울 강남구 강남대로 396',
	37.497952,
	127.027619
);

export const PANGYO_STATION = createMockPlace(
	'place_pangyo',
	'판교역',
	'경기도 성남시 분당구 판교역로 160',
	37.394755,
	127.111217
);

export const HONGDAE_STATION = createMockPlace(
	'place_hongdae',
	'홍대입구',
	'서울 마포구 양화로 160',
	37.557527,
	126.924473
);

export const HOME_PLACE = createMockPlace(
	'place_home',
	'우리집',
	'서울 서초구 서초대로 396',
	37.491852,
	127.007702
);

export const MOCK_SEARCHABLE_PLACES: Place[] = [
	GANGNAM_STATION,
	PANGYO_STATION,
	HONGDAE_STATION,
	HOME_PLACE,
	COMPANY_PLACE
];

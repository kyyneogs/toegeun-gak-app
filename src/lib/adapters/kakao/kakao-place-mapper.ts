import type { KakaoPlaceDocument } from '$lib/adapters/kakao/kakao-place-document';
import type { Place } from '$lib/domain/place/place';
import { toIso } from '$lib/utils/time';

export function mapKakaoPlace(document: KakaoPlaceDocument, now = new Date()): Place | null {
	const latitude = Number(document.y);
	const longitude = Number(document.x);
	const name = document.place_name?.trim();
	const providerPlaceId = document.id?.trim();

	if (!name || !providerPlaceId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}

	const timestamp = toIso(now);
	const address = document.road_address_name?.trim() || document.address_name?.trim() || name;

	return {
		id: `kakao_${providerPlaceId}`,
		name,
		address,
		latitude,
		longitude,
		provider: 'kakao',
		providerPlaceId,
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

export function mapKakaoPlaces(documents: KakaoPlaceDocument[], now = new Date()): Place[] {
	const places: Place[] = [];

	for (const document of documents) {
		const place = mapKakaoPlace(document, now);

		if (place) {
			places.push(place);
		}
	}

	return places;
}

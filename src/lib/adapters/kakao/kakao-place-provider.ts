import type { KakaoPlacesClient } from '$lib/adapters/kakao/kakao-places-sdk';
import { createKakaoPlacesSdkClient } from '$lib/adapters/kakao/kakao-places-sdk';
import { mapKakaoPlaces } from '$lib/adapters/kakao/kakao-place-mapper';
import type { Place } from '$lib/domain/place/place';
import type { PlaceService } from '$lib/ports/place-service';

export class KakaoPlaceProvider implements PlaceService {
	private readonly client: KakaoPlacesClient;

	constructor(appKey: string, client?: KakaoPlacesClient) {
		this.client = client ?? createKakaoPlacesSdkClient(appKey);
	}

	async search(query: string): Promise<Place[]> {
		const documents = await this.client.keywordSearch(query);
		return mapKakaoPlaces(documents);
	}
}

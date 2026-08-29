import type { Place } from '$lib/domain/place/place';

export interface PlaceService {
	search(query: string): Promise<Place[]>;
}

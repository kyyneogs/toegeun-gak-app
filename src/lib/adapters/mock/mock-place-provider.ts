import { MOCK_SEARCHABLE_PLACES } from '$lib/adapters/mock/mock-places';
import type { Place } from '$lib/domain/place/place';
import type { PlaceService } from '$lib/ports/place-service';

export class MockPlaceProvider implements PlaceService {
	constructor(private readonly catalog: Place[] = MOCK_SEARCHABLE_PLACES) {}

	async search(query: string): Promise<Place[]> {
		const normalized = query.trim().toLowerCase();

		if (!normalized) {
			return [];
		}

		return this.catalog.filter(
			(place) =>
				place.name.toLowerCase().includes(normalized) ||
				place.address.toLowerCase().includes(normalized)
		);
	}
}

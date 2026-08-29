import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import type { Place } from '$lib/domain/place/place';
import type { PlaceService } from '$lib/ports/place-service';

export class PlaceApplicationService implements PlaceService {
	constructor(private readonly provider: PlaceService) {}

	async search(query: string): Promise<Place[]> {
		const trimmed = query.trim();

		if (!trimmed) {
			return [];
		}

		try {
			return await this.provider.search(trimmed);
		} catch (cause) {
			throw new AppError(ERROR_CODES.PLACE_SEARCH_FAILED, undefined, cause);
		}
	}
}

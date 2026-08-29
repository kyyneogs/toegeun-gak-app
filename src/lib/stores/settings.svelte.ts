import { HOME_PLACE, COMPANY_PLACE } from '$lib/adapters/mock/mock-places';
import { getAppServices } from '$lib/application/composition';
import { DEFAULT_DEPARTURE_FROM } from '$lib/constants/recommendation';
import { STORAGE_KEYS } from '$lib/constants/storage-keys';
import type { Place } from '$lib/domain/place/place';

class SettingsStore {
	origin = $state<Place>(COMPANY_PLACE);
	home = $state<Place | null>(HOME_PLACE);
	defaultDepartureFrom = $state(DEFAULT_DEPARTURE_FROM);
	loaded = $state(false);

	async load(): Promise<void> {
		const storage = getAppServices().storage;
		this.origin = (await storage.get<Place>(STORAGE_KEYS.DEFAULT_ORIGIN)) ?? COMPANY_PLACE;
		this.home = (await storage.get<Place>(STORAGE_KEYS.HOME_PLACE)) ?? HOME_PLACE;
		this.defaultDepartureFrom =
			(await storage.get<string>(STORAGE_KEYS.DEFAULT_DEPARTURE_FROM)) ?? DEFAULT_DEPARTURE_FROM;
		this.loaded = true;
	}

	async saveOrigin(place: Place): Promise<void> {
		this.origin = place;
		await getAppServices().storage.set(STORAGE_KEYS.DEFAULT_ORIGIN, place);
	}

	async saveHome(place: Place | null): Promise<void> {
		this.home = place;

		if (place) {
			await getAppServices().storage.set(STORAGE_KEYS.HOME_PLACE, place);
			return;
		}

		await getAppServices().storage.remove(STORAGE_KEYS.HOME_PLACE);
	}

	async saveDefaultDepartureFrom(clock: string): Promise<void> {
		this.defaultDepartureFrom = clock;
		await getAppServices().storage.set(STORAGE_KEYS.DEFAULT_DEPARTURE_FROM, clock);
	}
}

export const settingsStore = new SettingsStore();

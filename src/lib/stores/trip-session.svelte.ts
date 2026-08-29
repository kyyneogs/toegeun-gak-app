import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { getAppServices } from '$lib/application/composition';
import { ERROR_USER_MESSAGES } from '$lib/constants/errors';
import { DEFAULT_DEPARTURE_FROM } from '$lib/constants/recommendation';
import { STORAGE_KEYS } from '$lib/constants/storage-keys';
import { toAppError } from '$lib/domain/errors';
import type { Place } from '$lib/domain/place/place';
import type {
	RecommendationExplanation,
	RecommendationResult
} from '$lib/domain/recommendation/types';
import type { Trip } from '$lib/domain/trip/trip';
import { settingsStore } from '$lib/stores/settings.svelte';
import { combineLocalDateAndClock, isClockTime } from '$lib/utils/time';

export type UiStatus = 'idle' | 'searching' | 'calculating' | 'result' | 'error';

class TripSessionStore {
	destination = $state<Place | null>(null);
	departureFromClock = $state(DEFAULT_DEPARTURE_FROM);
	status = $state<UiStatus>('idle');
	errorMessage = $state<string | null>(null);
	errorCode = $state<string | null>(null);
	trip = $state<Trip | null>(null);
	result = $state<RecommendationResult | null>(null);
	explanation = $state<RecommendationExplanation | null>(null);

	hydrateFromSettings(): void {
		this.departureFromClock = settingsStore.defaultDepartureFrom;
	}

	async restoreLastDestination(): Promise<void> {
		const last = await getAppServices().storage.get<Place>(STORAGE_KEYS.LAST_DESTINATION);

		if (last && !this.destination) {
			this.destination = last;
		}
	}

	async selectDestination(place: Place | null): Promise<void> {
		this.destination = place;

		if (place) {
			await getAppServices().storage.set(STORAGE_KEYS.LAST_DESTINATION, place);
		}
	}

	async calculate(): Promise<void> {
		if (!this.destination) {
			this.status = 'error';
			this.errorCode = 'INVALID_PLACE';
			this.errorMessage = ERROR_USER_MESSAGES.INVALID_PLACE;
			await goto(resolve('/result'));
			return;
		}

		if (!isClockTime(this.departureFromClock)) {
			this.status = 'error';
			this.errorCode = 'INVALID_REQUEST';
			this.errorMessage = ERROR_USER_MESSAGES.INVALID_REQUEST;
			await goto(resolve('/result'));
			return;
		}

		this.status = 'calculating';
		this.errorCode = null;
		this.errorMessage = null;
		this.result = null;
		this.explanation = null;
		await goto(resolve('/result'));

		try {
			const services = getAppServices();
			const departureFrom = combineLocalDateAndClock(this.departureFromClock);
			const trip = await services.tripService.createTrip({
				origin: settingsStore.origin,
				destination: this.destination,
				departureFrom
			});
			const result = await services.recommendationService.recommend({ trip });
			const explanation = await services.explanationService.explain(result, {
				originName: trip.origin.name,
				destinationName: trip.destination.name
			});

			this.trip = trip;
			this.result = result;
			this.explanation = explanation;
			this.status = 'result';
		} catch (error) {
			const appError = toAppError(error);
			console.error('Recommendation failed', { code: appError.code, cause: appError.cause });
			this.status = 'error';
			this.errorCode = appError.code;
			this.errorMessage = appError.message;
		}
	}

	resetResult(): void {
		this.status = 'idle';
		this.errorCode = null;
		this.errorMessage = null;
		this.result = null;
		this.explanation = null;
		this.trip = null;
	}
}

export const tripSession = new TripSessionStore();

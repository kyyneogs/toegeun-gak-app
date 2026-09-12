import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { fetchAiRoutePick } from '$lib/adapters/http/http-ai-pick';
import { getAppServices } from '$lib/application/composition';
import { ERROR_USER_MESSAGES } from '$lib/constants/errors';
import {
	calculateLoadingCopy,
	DEFAULT_DEPARTURE_FROM,
	OVERTIME_STEPS_MINUTES
} from '$lib/constants/recommendation';
import { STORAGE_KEYS } from '$lib/constants/storage-keys';
import { toAppError } from '$lib/domain/errors';
import type { Place } from '$lib/domain/place/place';
import type { DisplayCriterion } from '$lib/domain/recommendation/criteria';
import { displayedRecommendedRoute } from '$lib/domain/recommendation/display-route';
import type { RecommendProgressStage } from '$lib/domain/recommendation/progress';
import type {
	RecommendationExplanation,
	RecommendationResult,
	RecommendedRoute
} from '$lib/domain/recommendation/types';
import type { Trip } from '$lib/domain/trip/trip';
import { settingsStore } from '$lib/stores/settings.svelte';
import { addMinutes, combineLocalDateAndClock, formatClock, isClockTime } from '$lib/utils/time';

export type UiStatus = 'idle' | 'searching' | 'calculating' | 'result' | 'error';

class TripSessionStore {
	destination = $state<Place | null>(null);
	departureFromClock = $state(DEFAULT_DEPARTURE_FROM);
	arriveByEnabled = $state(false);
	arriveByClock = $state('21:00');
	selectedCriterion = $state<DisplayCriterion>('aiPick');
	status = $state<UiStatus>('idle');
	loadingStage = $state<RecommendProgressStage | null>(null);
	errorMessage = $state<string | null>(null);
	errorCode = $state<string | null>(null);
	trip = $state<Trip | null>(null);
	result = $state<RecommendationResult | null>(null);
	explanation = $state<RecommendationExplanation | null>(null);
	aiStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	aiReason = $state<string | null>(null);
	aiRouteIndex = $state<number | null>(null);
	aiErrorMessage = $state<string | null>(null);

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

	loadingCopy(): string {
		return calculateLoadingCopy(this.loadingStage);
	}

	displayedRecommended(): RecommendedRoute | null {
		if (!this.result) {
			return null;
		}

		return displayedRecommendedRoute(this.result, this.selectedCriterion, this.aiRouteIndex);
	}

	selectCriterion(criterion: DisplayCriterion): void {
		this.selectedCriterion = criterion;
	}

	async selectAiCriterion(): Promise<void> {
		this.selectedCriterion = 'aiPick';

		if (this.aiStatus === 'ready' || this.aiStatus === 'loading' || !this.result) {
			return;
		}

		await this.loadAiPick(this.result.id);
	}

	async delayDeparture(minutes: (typeof OVERTIME_STEPS_MINUTES)[number]): Promise<void> {
		const current = combineLocalDateAndClock(this.departureFromClock);
		this.departureFromClock = formatClock(addMinutes(current, minutes));
		await this.calculate();
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

		if (this.arriveByEnabled && !isClockTime(this.arriveByClock)) {
			this.status = 'error';
			this.errorCode = 'INVALID_REQUEST';
			this.errorMessage = ERROR_USER_MESSAGES.INVALID_REQUEST;
			await goto(resolve('/result'));
			return;
		}

		this.status = 'calculating';
		this.loadingStage = 'searchingRoutes';
		this.errorCode = null;
		this.errorMessage = null;
		this.result = null;
		this.explanation = null;
		this.clearAiPick();
		await goto(resolve('/result'));

		try {
			const services = getAppServices();
			const departureFrom = combineLocalDateAndClock(this.departureFromClock);
			const desiredArrivalAt = this.arriveByEnabled
				? desiredArrivalFromClocks(this.departureFromClock, this.arriveByClock)
				: undefined;
			const trip = await services.tripService.createTrip({
				origin: settingsStore.origin,
				destination: this.destination,
				departureFrom,
				desiredArrivalAt
			});
			const result = await services.recommendationService.recommend(
				{ trip },
				{
					onProgress: (stage) => {
						this.loadingStage = stage;
					}
				}
			);
			const explanation = await services.explanationService.explain(result, {
				originName: trip.origin.name,
				destinationName: trip.destination.name
			});

			this.trip = trip;
			this.result = result;
			this.explanation = explanation;
			this.loadingStage = 'aiPicking';
			await this.loadAiPick(result.id);
			this.selectedCriterion = this.aiStatus === 'ready' ? 'aiPick' : result.criterion;
			this.status = 'result';
			this.loadingStage = null;
		} catch (error) {
			const appError = toAppError(error);
			console.error('Recommendation failed', { code: appError.code, cause: appError.cause });
			this.status = 'error';
			this.errorCode = appError.code;
			this.errorMessage = appError.message;
			this.loadingStage = null;
		}
	}

	resetResult(): void {
		this.status = 'idle';
		this.errorCode = null;
		this.errorMessage = null;
		this.result = null;
		this.explanation = null;
		this.trip = null;
		this.selectedCriterion = 'aiPick';
		this.clearAiPick();
		this.loadingStage = null;
	}

	private async loadAiPick(recommendationId: string): Promise<void> {
		this.aiStatus = 'loading';
		this.aiErrorMessage = null;

		try {
			const pick = await fetchAiRoutePick(recommendationId);
			this.aiRouteIndex = pick.index;
			this.aiReason = pick.reason;
			this.aiStatus = 'ready';
		} catch (error) {
			const appError = toAppError(error);
			console.error('AI pick failed', { code: appError.code, cause: appError.cause });
			this.aiStatus = 'error';
			this.aiErrorMessage = appError.message;
		}
	}

	private clearAiPick(): void {
		this.aiStatus = 'idle';
		this.aiReason = null;
		this.aiRouteIndex = null;
		this.aiErrorMessage = null;
	}
}

export const tripSession = new TripSessionStore();

function desiredArrivalFromClocks(leaveClock: string, arriveClock: string): Date {
	const leaveAt = combineLocalDateAndClock(leaveClock);
	let arriveAt = combineLocalDateAndClock(arriveClock);

	if (arriveAt.getTime() <= leaveAt.getTime()) {
		arriveAt = addMinutes(arriveAt, 24 * 60);
	}

	return arriveAt;
}

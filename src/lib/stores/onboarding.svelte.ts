import { STORAGE_KEYS } from '$lib/constants/storage-keys';
import { DEFAULT_DEPARTURE_FROM } from '$lib/constants/recommendation';
import type { Place } from '$lib/domain/place/place';

const FIRST_STEP = 1;
const LAST_STEP = 3;

class OnboardingSession {
	hydrated = $state(false);
	completed = $state(false);
	step = $state(FIRST_STEP);
	origin = $state<Place | null>(null);
	home = $state<Place | null>(null);
	departureFromClock = $state(DEFAULT_DEPARTURE_FROM);

	hydrate(): void {
		if (typeof window === 'undefined') {
			return;
		}

		this.completed = window.localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === '1';
		this.hydrated = true;
	}

	markCompleted(): void {
		this.completed = true;

		if (typeof window !== 'undefined') {
			window.localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, '1');
		}
	}

	goNext(): void {
		if (this.step < LAST_STEP) {
			this.step = this.step + 1;
		}
	}

	resetDraft(): void {
		this.step = FIRST_STEP;
		this.origin = null;
		this.home = null;
		this.departureFromClock = DEFAULT_DEPARTURE_FROM;
	}
}

export const onboardingSession = new OnboardingSession();
export const ONBOARDING_LAST_STEP = LAST_STEP;

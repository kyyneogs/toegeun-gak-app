import {
	ONBOARDING_READY_ENTER_MS,
	ONBOARDING_READY_FADE_MS,
	ONBOARDING_READY_HOLD_MS
} from '$lib/constants/motion';

export function onboardingReadyTimings(reducedMotion: boolean): {
	fadeAt: number;
	doneAt: number;
} {
	if (reducedMotion) {
		return { fadeAt: 0, doneAt: 0 };
	}

	const fadeAt = ONBOARDING_READY_ENTER_MS + ONBOARDING_READY_HOLD_MS;
	return { fadeAt, doneAt: fadeAt + ONBOARDING_READY_FADE_MS };
}

export function shouldKeepOnboardingOverlay(
	showForm: boolean,
	ceremony: 'off' | 'ready' | 'leaving'
): boolean {
	return showForm || ceremony !== 'off';
}

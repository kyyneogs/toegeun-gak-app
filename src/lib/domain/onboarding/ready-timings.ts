import { ONBOARDING_READY_HOLD_MS, SPLASH_ENTER_MS, SPLASH_FADE_MS } from '$lib/constants/motion';

export function onboardingReadyTimings(reducedMotion: boolean): {
	fadeAt: number;
	doneAt: number;
} {
	if (reducedMotion) {
		return { fadeAt: 0, doneAt: 0 };
	}

	const fadeAt = SPLASH_ENTER_MS + ONBOARDING_READY_HOLD_MS;
	return { fadeAt, doneAt: fadeAt + SPLASH_FADE_MS };
}

export function shouldKeepOnboardingOverlay(
	showForm: boolean,
	ceremony: 'off' | 'ready' | 'leaving'
): boolean {
	return showForm || ceremony !== 'off';
}

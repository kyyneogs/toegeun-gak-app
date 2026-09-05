import { ONBOARDING_READY_HOLD_MS, SPLASH_ENTER_MS, SPLASH_FADE_MS } from '$lib/constants/motion';
import {
	onboardingReadyTimings,
	shouldKeepOnboardingOverlay
} from '$lib/domain/onboarding/ready-timings';
import { describe, expect, it } from 'vitest';

describe('onboardingReadyTimings', () => {
	it('holds the ready beat then fades before dismissing', () => {
		const timings = onboardingReadyTimings(false);
		expect(timings.fadeAt).toBe(SPLASH_ENTER_MS + ONBOARDING_READY_HOLD_MS);
		expect(timings.doneAt).toBe(timings.fadeAt + SPLASH_FADE_MS);
	});

	it('skips the wait when motion is reduced', () => {
		expect(onboardingReadyTimings(true)).toEqual({ fadeAt: 0, doneAt: 0 });
	});
});

describe('shouldKeepOnboardingOverlay', () => {
	it('stays up through the ready beat after the form would hide', () => {
		expect(shouldKeepOnboardingOverlay(false, 'ready')).toBe(true);
		expect(shouldKeepOnboardingOverlay(false, 'leaving')).toBe(true);
		expect(shouldKeepOnboardingOverlay(false, 'off')).toBe(false);
	});
});

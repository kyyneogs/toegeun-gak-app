import { isAuthPath, shouldShowOnboarding } from '$lib/domain/onboarding/should-show';
import { describe, expect, it } from 'vitest';

const READY = {
	splashFinished: true,
	settingsLoaded: true,
	sessionLoaded: true,
	onboardingHydrated: true,
	loggedIn: false,
	alreadyCompleted: false,
	onAuthPage: false
};

describe('shouldShowOnboarding', () => {
	it('shows once setup sources are ready for a guest', () => {
		expect(shouldShowOnboarding(READY)).toBe(true);
	});

	it('hides while splash, session, or onboarding storage is still loading', () => {
		expect(shouldShowOnboarding({ ...READY, splashFinished: false })).toBe(false);
		expect(shouldShowOnboarding({ ...READY, sessionLoaded: false })).toBe(false);
		expect(shouldShowOnboarding({ ...READY, onboardingHydrated: false })).toBe(false);
	});

	it('does not show after login, skip, or on the auth pages', () => {
		expect(shouldShowOnboarding({ ...READY, loggedIn: true })).toBe(false);
		expect(shouldShowOnboarding({ ...READY, alreadyCompleted: true })).toBe(false);
		expect(shouldShowOnboarding({ ...READY, onAuthPage: true })).toBe(false);
	});
});

describe('isAuthPath', () => {
	it('treats login and register as auth pages', () => {
		expect(isAuthPath('/login')).toBe(true);
		expect(isAuthPath('/register')).toBe(true);
		expect(isAuthPath('/')).toBe(false);
	});
});

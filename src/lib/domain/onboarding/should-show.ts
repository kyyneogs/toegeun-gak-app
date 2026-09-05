const AUTH_PATHS = new Set(['/login', '/register']);

export function isAuthPath(pathname: string): boolean {
	return AUTH_PATHS.has(pathname);
}

export function shouldShowOnboarding(input: {
	splashFinished: boolean;
	settingsLoaded: boolean;
	sessionLoaded: boolean;
	onboardingHydrated: boolean;
	loggedIn: boolean;
	alreadyCompleted: boolean;
	onAuthPage: boolean;
}): boolean {
	if (
		!input.splashFinished ||
		!input.settingsLoaded ||
		!input.sessionLoaded ||
		!input.onboardingHydrated
	) {
		return false;
	}

	if (input.loggedIn || input.alreadyCompleted || input.onAuthPage) {
		return false;
	}

	return true;
}

export const SPLASH_ENTER_MS = 1000;
export const SPLASH_GREETING_DELAY_MS = 600;
export const SPLASH_GREETING_MS = 2400;
export const SPLASH_HOLD_MS = 2600;
export const SPLASH_FADE_MS = 700;
export const MIN_SPLASH_MS = 4000;
export const ONBOARDING_READY_ENTER_MS = 280;
export const ONBOARDING_READY_HOLD_MS = 240;
export const ONBOARDING_READY_FADE_MS = 280;
export const PAGE_TRANSITION_MS = 280;
export const COUNT_UP_MS = 400;
export const ELLIPSIS_INTERVAL_MS = 400;
export const ELLIPSIS_MAX_DOTS = 3;
export const SKELETON_LINE_DELAY_MS = 120;
export const SUCCESS_CIRCLE_MS = 350;
export const SUCCESS_CHECK_DELAY_MS = 300;
export const SUCCESS_CHECK_MS = 250;
export const MAX_CEREMONY_MS = 800;

export type NavigationDirection = 'back' | 'forward';

export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}

	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function easeOutCubic(progress: number): number {
	const clamped = Math.min(1, Math.max(0, progress));
	return 1 - (1 - clamped) ** 3;
}

export function countToward(target: number, elapsedMs: number, durationMs: number): number {
	if (durationMs <= 0 || prefersReducedMotion()) {
		return target;
	}

	const progressed = easeOutCubic(elapsedMs / durationMs);
	return Math.round(target * progressed);
}

export function pathDepth(pathname: string): number {
	return pathname.split('/').filter((segment) => segment.length > 0).length;
}

export function isBackNavigation(
	fromPath: string,
	toPath: string,
	navigationType: string
): boolean {
	return navigationDirection(fromPath, toPath, navigationType) === 'back';
}

export function navigationDirection(
	fromPath: string,
	toPath: string,
	navigationType: string
): NavigationDirection {
	if (navigationType === 'popstate') {
		return 'back';
	}

	const fromDepth = pathDepth(fromPath);
	const toDepth = pathDepth(toPath);

	if (toDepth < fromDepth) {
		return 'back';
	}

	return 'forward';
}

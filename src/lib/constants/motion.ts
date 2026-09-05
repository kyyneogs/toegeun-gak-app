export const SPLASH_ENTER_MS = 640;
export const SPLASH_HOLD_MS = 1100;
export const SPLASH_FADE_MS = 400;
export const ONBOARDING_READY_HOLD_MS = 900;
export const PAGE_TRANSITION_MS = 320;
export const COUNT_UP_MS = 400;
export const ELLIPSIS_INTERVAL_MS = 400;
export const HOME_STAGGER_MS = 60;
export const ELLIPSIS_MAX_DOTS = 3;
export const SKELETON_LINE_DELAY_MS = 120;

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
	if (navigationType === 'popstate') {
		return true;
	}

	return pathDepth(toPath) < pathDepth(fromPath);
}

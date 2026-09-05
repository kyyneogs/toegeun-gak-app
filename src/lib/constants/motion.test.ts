import {
	ONBOARDING_READY_HOLD_MS,
	PAGE_TRANSITION_MS,
	countToward,
	easeOutCubic,
	isBackNavigation,
	pathDepth
} from '$lib/constants/motion';
import { describe, expect, it } from 'vitest';

describe('countToward', () => {
	it('starts at zero and lands on the target at the end', () => {
		expect(countToward(30, 0, 400)).toBe(0);
		expect(countToward(30, 400, 400)).toBe(30);
		expect(countToward(15_000, 400, 400)).toBe(15_000);
	});

	it('jumps to the target when duration is zero', () => {
		expect(countToward(30, 0, 0)).toBe(30);
	});

	it('eases out so the middle is past halfway', () => {
		expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
		expect(countToward(100, 200, 400)).toBeGreaterThan(50);
	});
});

describe('isBackNavigation', () => {
	it('treats a shallower path as going back', () => {
		expect(pathDepth('/result/route')).toBe(2);
		expect(isBackNavigation('/result/route', '/result', 'link')).toBe(true);
		expect(isBackNavigation('/settings', '/', 'link')).toBe(true);
		expect(isBackNavigation('/', '/settings', 'link')).toBe(false);
		expect(isBackNavigation('/result', '/result/route', 'link')).toBe(false);
	});

	it('treats browser history pop as back', () => {
		expect(isBackNavigation('/', '/result/route', 'popstate')).toBe(true);
		expect(PAGE_TRANSITION_MS).toBe(320);
		expect(ONBOARDING_READY_HOLD_MS).toBe(900);
	});
});

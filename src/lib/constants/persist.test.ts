import {
	clampStandupLeadMinutes,
	DEFAULT_STANDUP_LEAD_MINUTES,
	standupLeadMs
} from '$lib/constants/persist';
import { describe, expect, it } from 'vitest';

describe('standup lead minutes', () => {
	it('defaults to five minutes before standup', () => {
		expect(clampStandupLeadMinutes(undefined)).toBe(DEFAULT_STANDUP_LEAD_MINUTES);
		expect(standupLeadMs(undefined)).toBe(5 * 60 * 1000);
	});

	it('keeps an allowed option', () => {
		expect(clampStandupLeadMinutes(0)).toBe(0);
		expect(clampStandupLeadMinutes(10)).toBe(10);
		expect(standupLeadMs(3)).toBe(3 * 60 * 1000);
	});
});

import { MIN_WALK_DURATION_SECONDS, walkDurationSeconds } from '$lib/constants/walk';
import { describe, expect, it } from 'vitest';

describe('walkDurationSeconds', () => {
	it('keeps a missing walk at zero', () => {
		expect(walkDurationSeconds(0)).toBe(0);
		expect(walkDurationSeconds(-1)).toBe(0);
	});

	it('raises a real walk to at least one minute', () => {
		expect(walkDurationSeconds(1)).toBe(MIN_WALK_DURATION_SECONDS);
		expect(walkDurationSeconds(59.4)).toBe(MIN_WALK_DURATION_SECONDS);
		expect(walkDurationSeconds(90)).toBe(90);
	});
});

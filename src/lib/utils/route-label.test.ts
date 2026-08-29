import {
	chosenTripLineLabel,
	standUpStartsWithWalk,
	transitLineLabel
} from '$lib/utils/route-label';
import { describe, expect, it } from 'vitest';

describe('transitLineLabel', () => {
	it('joins transit section names and skips waits', () => {
		expect(
			transitLineLabel([{ routeName: undefined }, { routeName: '330' }, { routeName: '60' }])
		).toBe('330 · 60');
	});

	it('falls back when no named transit section exists', () => {
		expect(transitLineLabel([{}])).toBe('도보 포함 경로');
	});
});

describe('chosenTripLineLabel', () => {
	it('joins chosen GTFS route ids', () => {
		expect(chosenTripLineLabel(['330', '60'])).toBe('330 · 60');
	});
});

describe('standUpStartsWithWalk', () => {
	it('is true when the first action is a walk', () => {
		expect(standUpStartsWithWalk([{ type: 'walk' }, { type: 'bus' }])).toBe(true);
		expect(standUpStartsWithWalk([{ type: 'wait' }, { type: 'bus' }])).toBe(false);
	});
});

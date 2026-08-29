import {
	extractRouteShortName,
	isStopNameMatch,
	normalizeStopName
} from '$lib/adapters/gtfs/gtfs-match';
import { describe, expect, it } from 'vitest';

describe('gtfs name matching', () => {
	it('pulls the Kakao vehicle number from a typed route name', () => {
		expect(extractRouteShortName('광역:5001')).toBe('5001');
		expect(extractRouteShortName('5001번')).toBe('5001');
		expect(extractRouteShortName('146')).toBe('146');
		expect(extractRouteShortName('수도권:신분당선')).toBe('신분당선');
		expect(extractRouteShortName('서울 8호선')).toBe('8호선');
	});

	it('normalizes stop names by dropping spaces, parentheses, and a trailing 역', () => {
		expect(normalizeStopName('판교역')).toBe('판교');
		expect(normalizeStopName('판교 역')).toBe('판교');
		expect(normalizeStopName('정류장')).toBe('정류장');
		expect(normalizeStopName('판교(판교테크노밸리)')).toBe('판교');
	});

	it('matches Kakao stop names onto longer GTFS stop names', () => {
		expect(isStopNameMatch('판교역', '판교역서편')).toBe(true);
		expect(isStopNameMatch('판교역', '판교(판교테크노밸리)')).toBe(true);
		expect(isStopNameMatch('강남역', '신분당선강남역(중)')).toBe(true);
		expect(isStopNameMatch('없는정류장', '판교역서편')).toBe(false);
	});
});

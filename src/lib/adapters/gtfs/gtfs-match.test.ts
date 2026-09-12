import {
	extractRouteShortName,
	isStopNameMatch,
	normalizeStopName,
	routeShortNamesOverlap,
	uniqueStopNameLookups
} from '$lib/adapters/gtfs/gtfs-match';
import { describe, expect, it } from 'vitest';

describe('gtfs name matching', () => {
	it('pulls the Kakao vehicle number from a typed route name', () => {
		expect(extractRouteShortName('광역:5001')).toBe('5001');
		expect(extractRouteShortName('5001번')).toBe('5001');
		expect(extractRouteShortName('146')).toBe('146');
		expect(extractRouteShortName('수도권:신분당선')).toBe('신분당선');
		expect(extractRouteShortName('서울 8호선')).toBe('8호선');
		expect(extractRouteShortName('수도권8호선')).toBe('8호선');
		expect(extractRouteShortName('지하철8호선')).toBe('8호선');
	});

	it('treats Kakao and GTFS subway labels as the same line', () => {
		expect(routeShortNamesOverlap('8호선', '서울 8호선')).toBe(true);
		expect(routeShortNamesOverlap('수도권:8호선', '서울 8호선')).toBe(true);
	});

	it('looks up 역 and 역-less stop names together', () => {
		expect(uniqueStopNameLookups('모란역')).toEqual(['모란역', '모란']);
		expect(isStopNameMatch('모란역', '모란')).toBe(true);
		expect(isStopNameMatch('잠실역', '잠실')).toBe(true);
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
		expect(isStopNameMatch('잠실역', '잠실(송파구청)')).toBe(true);
		expect(isStopNameMatch('없는정류장', '판교역서편')).toBe(false);
		expect(isStopNameMatch('잠실역', '잠실새내역4번출구')).toBe(false);
		expect(isStopNameMatch('잠실역', '잠실나루')).toBe(false);
		expect(isStopNameMatch('모란역', '모란시장')).toBe(false);
	});
});

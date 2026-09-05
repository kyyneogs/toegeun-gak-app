import { corridorAliasesForShortName, isCorridorShortName } from '$lib/constants/gtfs-corridor';
import { extractRouteShortName } from '$lib/adapters/gtfs/gtfs-match';
import { describe, expect, it } from 'vitest';

describe('corridor short names', () => {
	it('matches nationwide feed names onto the whitelist', () => {
		expect(isCorridorShortName(extractRouteShortName('서울 2호선'))).toBe(true);
		expect(isCorridorShortName(extractRouteShortName('신분당선'))).toBe(true);
		expect(isCorridorShortName(extractRouteShortName('수인분당선'))).toBe(true);
		expect(isCorridorShortName(extractRouteShortName('경강선'))).toBe(true);
		expect(isCorridorShortName('5002A')).toBe(true);
		expect(isCorridorShortName('5001')).toBe(true);
	});

	it('does not pull unrelated variants', () => {
		expect(isCorridorShortName(extractRouteShortName('인천 2호선'))).toBe(false);
		expect(isCorridorShortName('5001-1')).toBe(false);
		expect(isCorridorShortName('WRONG')).toBe(false);
	});

	it('adds Kakao-facing aliases for line suffixes and bus letters', () => {
		expect(corridorAliasesForShortName('신분당선')).toEqual(['신분당선', '신분당']);
		expect(corridorAliasesForShortName('5002A')).toEqual(['5002A', '5002']);
	});
});

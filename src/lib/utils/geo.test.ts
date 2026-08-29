import { placePairKey, roundCoordinate, toMinuteStamp } from '$lib/utils/geo';
import { describe, expect, it } from 'vitest';

describe('geo cache keys', () => {
	it('formats local minute stamps as yyyymmddhhmi', () => {
		expect(toMinuteStamp(new Date(2026, 7, 29, 18, 5, 0, 0))).toBe('202608291805');
	});

	it('rounds coordinates for cache keys', () => {
		expect(roundCoordinate(127.0276191)).toBe('127.02762');
	});

	it('builds a place-pair key from rounded coordinates', () => {
		expect(
			placePairKey(
				{ latitude: 37.497952, longitude: 127.027619 },
				{ latitude: 37.500622, longitude: 127.036456 }
			)
		).toBe('37.49795:127.02762:37.50062:127.03646');
	});
});

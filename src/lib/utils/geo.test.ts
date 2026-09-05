import { MIN_WALK_DURATION_SECONDS } from '$lib/constants/walk';
import {
	closestPoint,
	distanceMeters,
	placePairKey,
	roundCoordinate,
	toMinuteStamp,
	walkingSecondsBetween
} from '$lib/utils/geo';
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

describe('walking distance', () => {
	it('picks the closest stop and converts it to walking seconds', () => {
		const origin = { latitude: 37.40496, longitude: 127.11132 };
		const nearby = { latitude: 37.4051, longitude: 127.1114 };
		const far = { latitude: 37.42, longitude: 127.13 };

		expect(closestPoint(origin, [far, nearby])).toEqual(nearby);
		expect(walkingSecondsBetween(origin, nearby)).toBe(MIN_WALK_DURATION_SECONDS);
		expect(walkingSecondsBetween(origin, nearby)).toBeLessThan(walkingSecondsBetween(origin, far));
		expect(walkingSecondsBetween(origin, origin)).toBe(0);
		expect(distanceMeters(origin, nearby)).toBeGreaterThan(0);
	});
});

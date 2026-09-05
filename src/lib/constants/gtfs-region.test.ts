import {
	isPointInBoundingBox,
	SEONGNAM_BOUNDING_BOX,
	SEOUL_BOUNDING_BOX
} from '$lib/constants/gtfs-region';
import { describe, expect, it } from 'vitest';

describe('GTFS region boxes', () => {
	it('places Gangnam in Seoul and Pangyo in Seongnam', () => {
		expect(isPointInBoundingBox(37.497, 127.027, SEOUL_BOUNDING_BOX)).toBe(true);
		expect(isPointInBoundingBox(37.497, 127.027, SEONGNAM_BOUNDING_BOX)).toBe(false);
		expect(isPointInBoundingBox(37.394, 127.111, SEONGNAM_BOUNDING_BOX)).toBe(true);
		expect(isPointInBoundingBox(37.394, 127.111, SEOUL_BOUNDING_BOX)).toBe(false);
	});
});

import { KAKAO_GTFS_ROUTE_COPY, scheduleRouteCopy } from '$lib/constants/kakao';
import { describe, expect, it } from 'vitest';

describe('scheduleRouteCopy', () => {
	it('uses GTFS static copy', () => {
		expect(scheduleRouteCopy('gtfs')).toBe(KAKAO_GTFS_ROUTE_COPY);
		expect(scheduleRouteCopy(undefined)).toBe(KAKAO_GTFS_ROUTE_COPY);
	});
});

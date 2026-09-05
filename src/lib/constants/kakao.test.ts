import {
	KAKAO_CONNECTION_FAILURE_MESSAGE,
	KAKAO_GTFS_ROUTE_COPY,
	KAKAO_ROUTE_CONNECTED_MESSAGE,
	scheduleRouteCopy
} from '$lib/constants/kakao';
import { describe, expect, it } from 'vitest';

describe('scheduleRouteCopy', () => {
	it('uses GTFS static 해요체 copy', () => {
		expect(KAKAO_GTFS_ROUTE_COPY).toBe('시간표 기준이에요. 실시간은 아니에요.');
		expect(scheduleRouteCopy('gtfs')).toBe(KAKAO_GTFS_ROUTE_COPY);
		expect(scheduleRouteCopy(undefined)).toBe(KAKAO_GTFS_ROUTE_COPY);
	});

	it('keeps Kakao connection facts in 해요체', () => {
		expect(KAKAO_ROUTE_CONNECTED_MESSAGE).toContain('연결됐어요');
		expect(KAKAO_CONNECTION_FAILURE_MESSAGE).toContain('등록해 주세요');
	});
});

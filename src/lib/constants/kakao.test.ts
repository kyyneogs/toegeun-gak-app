import {
	KAKAO_GTFS_ROUTE_COPY,
	KAKAO_SCHEDULE_ROUTE_COPY,
	scheduleExplanationCopy,
	scheduleRouteCopy
} from '$lib/constants/kakao';
import { describe, expect, it } from 'vitest';

describe('scheduleRouteCopy', () => {
	it('uses timetable copy for GTFS and estimated copy otherwise', () => {
		expect(scheduleRouteCopy('gtfs')).toBe(KAKAO_GTFS_ROUTE_COPY);
		expect(scheduleRouteCopy('estimated')).toBe(KAKAO_SCHEDULE_ROUTE_COPY);
		expect(scheduleRouteCopy(undefined)).toBe(KAKAO_SCHEDULE_ROUTE_COPY);
	});
});

describe('scheduleExplanationCopy', () => {
	it('prefixes the route copy for the recommendation explanation', () => {
		expect(scheduleExplanationCopy('gtfs')).toBe(
			`지금 경로는 Kakao 탐색 결과이고, 이 퇴근각은 ${KAKAO_GTFS_ROUTE_COPY}`
		);
		expect(scheduleExplanationCopy('estimated')).toBe(
			`지금 경로는 Kakao 탐색 결과이고, 이 퇴근각은 ${KAKAO_SCHEDULE_ROUTE_COPY}`
		);
	});
});

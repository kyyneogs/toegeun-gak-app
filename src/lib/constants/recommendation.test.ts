import {
	accountIdentityLabel,
	HEADWAY_LOSS_TITLE,
	HOME_CTA_LABEL,
	PUSH_DEVICE_UNAVAILABLE,
	STAND_UP_BOARD_LABEL,
	STAND_UP_WALK_LABEL,
	STANDUP_CANCEL_ARIA,
	STANDUP_CANCEL_HELPER,
	STANDUP_EXISTING_TITLE,
	STANDUP_KEEP_CTA,
	STANDUP_PAGE_TITLE,
	STANDUP_REPLACE_CTA,
	STANDUP_ROUTE_MISSING,
	STANDUP_SCHEDULED_EMPTY,
	STANDUP_SCHEDULED_LABEL,
	homeOriginCopy,
	greetingCopy,
	calculateLoadingCopy,
	criterionLabel,
	resultArrivalCopy
} from '$lib/constants/recommendation';
import { describe, expect, it } from 'vitest';

describe('recommendation copy', () => {
	it('labels oauth accounts when email is missing', () => {
		expect(accountIdentityLabel({ email: null, authProvider: 'google' })).toBe('Google 계정');
	});

	it('uses 해요체 for standup, home CTA, and loss title', () => {
		expect(STAND_UP_WALK_LABEL).toBe('이때 일어나면 돼요');
		expect(STAND_UP_BOARD_LABEL).toBe('이때 타면 돼요');
		expect(HEADWAY_LOSS_TITLE).toBe('1분만 늦으면요');
		expect(HOME_CTA_LABEL).toBe('퇴근각 볼게요');
	});

	it('names scheduled standup list and cancel in 해요체', () => {
		expect(STANDUP_SCHEDULED_LABEL).toBe('맞춰 둔 알림');
		expect(STANDUP_SCHEDULED_EMPTY).toBe('맞춰 둔 알림이 없어요.');
		expect(STANDUP_PAGE_TITLE).toBe('알림');
		expect(STANDUP_CANCEL_ARIA).toBe('알림 지우기');
		expect(STANDUP_CANCEL_HELPER).toBe('이 탭을 닫거나 새로고침해야 기기 타이머도 꺼져요.');
		expect(STANDUP_EXISTING_TITLE).toBe('이미 맞춰 둔 알림이 있어요');
		expect(STANDUP_REPLACE_CTA).toBe('이전 알림을 지우고 이걸로 맞출게요');
		expect(STANDUP_KEEP_CTA).toBe('그대로 두고 하나 더 맞출게요');
		expect(PUSH_DEVICE_UNAVAILABLE).toBe('알림은 예약했지만 이 기기 푸시는 못 받았어요.');
		expect(STANDUP_ROUTE_MISSING).toBe('이 알림에는 저장된 경로가 없어요.');
	});

	it('builds origin and arrival lines without repeating the hero', () => {
		expect(homeOriginCopy('회사')).toBe('출발지는 회사예요');
		expect(homeOriginCopy('판교역')).toBe('출발지는 판교역이에요');
		expect(resultArrivalCopy('5002', '19:00')).toBe('5002 타고 19:00에 도착해요');
		expect(resultArrivalCopy(null, '19:00')).toBe('19:00에 도착해요');
	});

	it('labels route criteria in 해요체 chips', () => {
		expect(criterionLabel('earliestArrival')).toBe('빠른 도착');
		expect(criterionLabel('shortestDuration')).toBe('짧은 이동');
		expect(criterionLabel('leastWalking')).toBe('적은 도보');
		expect(criterionLabel('fewestTransfers')).toBe('적은 환승');
		expect(criterionLabel('aiPick')).toBe('AI 추천');
	});

	it('names loading stages in 해요체', () => {
		expect(calculateLoadingCopy('searchingRoutes')).toBe('경로를 검색 중이에요');
		expect(calculateLoadingCopy('routesFound')).toBe('경로를 찾았어요');
		expect(calculateLoadingCopy('timingRoutes')).toBe('최적 경로를 탐색 중이에요');
		expect(calculateLoadingCopy('aiPicking')).toBe('AI가 추천 중이에요');
	});

	it('picks a time-of-day greeting', () => {
		expect(greetingCopy(new Date(2026, 7, 30, 8, 0, 0))).toBe('좋은 아침이에요');
		expect(greetingCopy(new Date(2026, 7, 30, 14, 0, 0))).toBe('오늘도 퇴근각이에요');
		expect(greetingCopy(new Date(2026, 7, 30, 19, 0, 0))).toBe('이제 퇴근할 시간이에요');
		expect(greetingCopy(new Date(2026, 7, 30, 23, 0, 0))).toBe('오늘 하루 수고했어요');
	});
});

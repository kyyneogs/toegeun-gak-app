import {
	accountIdentityLabel,
	HEADWAY_LOSS_TITLE,
	HOME_CTA_LABEL,
	STAND_UP_BOARD_LABEL,
	STAND_UP_WALK_LABEL,
	homeOriginCopy,
	greetingCopy,
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
	});

	it('picks a time-of-day greeting', () => {
		expect(greetingCopy(new Date(2026, 7, 30, 8, 0, 0))).toBe('좋은 아침이에요');
		expect(greetingCopy(new Date(2026, 7, 30, 14, 0, 0))).toBe('오늘도 퇴근각이에요');
		expect(greetingCopy(new Date(2026, 7, 30, 19, 0, 0))).toBe('이제 퇴근할 시간이에요');
		expect(greetingCopy(new Date(2026, 7, 30, 23, 0, 0))).toBe('오늘 하루 수고했어요');
	});
});

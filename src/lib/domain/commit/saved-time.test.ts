import {
	clockMinutesInSeoul,
	formatSavedDuration,
	localServiceDate,
	savedArrivalSeconds,
	startOfLocalMonth,
	startOfLocalWeek,
	startOfSeoulWeek
} from '$lib/domain/commit/saved-time';
import { combineLocalDateAndClock, toIso } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

describe('savedArrivalSeconds', () => {
	it('credits only earlier arrivals than the naive leave', () => {
		const naive = toIso(combineLocalDateAndClock('19:10', DAY));
		const committed = toIso(combineLocalDateAndClock('18:50', DAY));
		expect(savedArrivalSeconds(committed, naive)).toBe(20 * 60);
	});

	it('does not go negative when the committed route is slower', () => {
		const naive = toIso(combineLocalDateAndClock('18:50', DAY));
		const committed = toIso(combineLocalDateAndClock('19:10', DAY));
		expect(savedArrivalSeconds(committed, naive)).toBe(0);
	});
});

describe('saved time windows', () => {
	it('starts the week on Monday', () => {
		const sunday = new Date(2026, 7, 30, 15, 0, 0);
		expect(localServiceDate(startOfLocalWeek(sunday))).toBe('2026-08-24');
	});

	it('starts the month on the first day', () => {
		expect(localServiceDate(startOfLocalMonth(DAY))).toBe('2026-08-01');
	});

	it('formats hours and leftover minutes', () => {
		expect(formatSavedDuration(90 * 60)).toBe('1시간 30분');
		expect(formatSavedDuration(12 * 60)).toBe('12분');
		expect(formatSavedDuration(120 * 60)).toBe('2시간');
	});
});

describe('Seoul ranking clocks', () => {
	it('reads leave minutes in Asia/Seoul', () => {
		expect(clockMinutesInSeoul('2026-08-29T09:30:00.000Z')).toBe(18 * 60 + 30);
	});

	it('starts the Seoul week on Monday 00:00 KST', () => {
		const sundayAfternoonKst = new Date('2026-08-30T06:00:00.000Z');
		expect(startOfSeoulWeek(sundayAfternoonKst).toISOString()).toBe('2026-08-23T15:00:00.000Z');
	});
});

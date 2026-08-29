import { materializeRouteTemplate } from '$lib/domain/route/schedule';
import type { RouteTemplate } from '$lib/domain/route/template';
import { combineLocalDateAndClock } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

const TEMPLATE: RouteTemplate = {
	transferCount: 0,
	legs: [
		{
			type: 'walk',
			durationSeconds: 6 * 60,
			startPlaceName: '회사',
			endPlaceName: '정류장'
		},
		{
			type: 'bus',
			durationSeconds: 23 * 60,
			startPlaceName: '정류장',
			endPlaceName: '도착정류장',
			routeName: '146번'
		},
		{
			type: 'walk',
			durationSeconds: 2 * 60,
			startPlaceName: '도착정류장',
			endPlaceName: '집'
		}
	]
};

describe('materializeRouteTemplate', () => {
	it('keeps Kakao live times without a wait section', async () => {
		const route = await materializeRouteTemplate(TEMPLATE, {
			provider: 'kakao',
			routeId: 'live',
			leaveAt: combineLocalDateAndClock('18:07', DAY)
		});

		expect(route?.waitingTimeSeconds).toBe(0);
		expect(route?.sections.some((section) => section.type === 'wait')).toBe(false);
		expect(route?.totalTimeSeconds).toBe(31 * 60);
		expect(route?.scheduleSource).toBeUndefined();
	});
});

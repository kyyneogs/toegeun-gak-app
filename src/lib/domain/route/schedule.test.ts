import { nextBusAt } from '$lib/domain/route/headway';
import { materializeRouteTemplate } from '$lib/domain/route/schedule';
import type { RouteTemplate } from '$lib/domain/route/template';
import { combineLocalDateAndClock, formatClock } from '$lib/utils/time';
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
			leaveAt: combineLocalDateAndClock('18:07', DAY),
			applyHeadwayWait: false
		});

		expect(route?.waitingTimeSeconds).toBe(0);
		expect(route?.sections.some((section) => section.type === 'wait')).toBe(false);
		expect(route?.totalTimeSeconds).toBe(31 * 60);
		expect(route?.scheduleSource).toBeUndefined();
	});

	it('waits for the next headway slot without a TimetablePort', async () => {
		const firstBus = combineLocalDateAndClock('18:00', DAY);
		const lastBus = combineLocalDateAndClock('23:00', DAY);
		const route = await materializeRouteTemplate(TEMPLATE, {
			provider: 'schedule',
			routeId: 'slot',
			leaveAt: combineLocalDateAndClock('18:07', DAY),
			applyHeadwayWait: true,
			resolveFirstDeparture: async (arriveAtStop) => {
				const departureAt = nextBusAt(arriveAtStop, firstBus, lastBus, 20);
				return departureAt ? { departureAt, source: 'estimated' } : null;
			}
		});

		expect(route?.waitingTimeSeconds).toBe(7 * 60);
		expect(route?.scheduleSource).toBe('estimated');
		const bus = route!.sections.find((section) => section.type === 'bus');
		expect(formatClock(new Date(bus!.departureAt))).toBe('18:20');
	});

	it('uses resolveFirstDeparture instead of a 20-minute grid', async () => {
		const route = await materializeRouteTemplate(TEMPLATE, {
			provider: 'schedule',
			routeId: 'gtfs',
			leaveAt: combineLocalDateAndClock('18:07', DAY),
			applyHeadwayWait: true,
			resolveFirstDeparture: async () => ({
				departureAt: combineLocalDateAndClock('18:25', DAY),
				source: 'gtfs'
			})
		});

		expect(route?.waitingTimeSeconds).toBe(12 * 60);
		expect(route?.scheduleSource).toBe('gtfs');
		const bus = route!.sections.find((section) => section.type === 'bus');
		expect(formatClock(new Date(bus!.departureAt))).toBe('18:25');
	});
});

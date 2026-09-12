import { parseStandupJobRoute, standupRouteFromDisplayed } from '$lib/domain/notify/standup-route';
import type { RecommendedRoute } from '$lib/domain/recommendation/types';
import { describe, expect, it } from 'vitest';

function displayed(): RecommendedRoute {
	return {
		departureAt: '2026-09-12T09:19:00.000Z',
		expectedArrivalAt: '2026-09-12T10:00:00.000Z',
		totalTimeSeconds: 2460,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: 360,
		transferCount: 0,
		chosenTrips: [],
		headwayLoss: null,
		route: {
			provider: 'test',
			routeId: 'r1',
			totalTimeSeconds: 2460,
			movingTimeSeconds: 2100,
			waitingTimeSeconds: 0,
			walkingTimeSeconds: 360,
			transferCount: 0,
			departureAt: '2026-09-12T09:19:00.000Z',
			arrivalAt: '2026-09-12T10:00:00.000Z',
			sections: [
				{
					sequence: 1,
					type: 'walk',
					startPlaceName: '회사',
					endPlaceName: '모란역',
					departureAt: '2026-09-12T09:19:00.000Z',
					arrivalAt: '2026-09-12T09:25:00.000Z',
					waitingTimeSeconds: 0
				},
				{
					sequence: 2,
					type: 'subway',
					startPlaceName: '모란역',
					endPlaceName: '강남역',
					departureAt: '2026-09-12T09:25:00.000Z',
					arrivalAt: '2026-09-12T10:00:00.000Z',
					waitingTimeSeconds: 0,
					routeName: '8호선'
				}
			]
		}
	};
}

describe('standup job route', () => {
	it('keeps origin, line, and sections for later viewing', () => {
		const route = standupRouteFromDisplayed(displayed(), '회사', '강남역', 'gtfs');
		expect(route.lineLabel).toBe('8호선');
		expect(parseStandupJobRoute(route)?.sections).toHaveLength(2);
		expect(parseStandupJobRoute(JSON.stringify(route))?.originName).toBe('회사');
	});

	it('rejects a payload without sections', () => {
		expect(parseStandupJobRoute({ originName: '회사', destinationName: '집' })).toBeNull();
	});
});

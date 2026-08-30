import { HEADWAY_ALT_COST_KRW } from '$lib/constants/recommendation';
import { headwayLossCopy, measureHeadwayLoss } from '$lib/domain/optimization/headway-loss';
import type { TransitRoute } from '$lib/domain/route/route';
import type { NextTripQuery, TimetablePort } from '$lib/ports/timetable-port';
import { combineLocalDateAndClock, toIso } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

function iso(clock: string): string {
	return toIso(combineLocalDateAndClock(clock, DAY));
}

function trip(routeId: string, board: string, alight: string) {
	return {
		routeId,
		tripId: `${routeId}_${board}`,
		boardTime: combineLocalDateAndClock(board, DAY),
		alightTime: combineLocalDateAndClock(alight, DAY)
	};
}

class ScriptedTimetable implements TimetablePort {
	queriedRouteIds: string[] = [];

	constructor(private readonly departures: Record<string, { board: string; alight: string }[]>) {}

	async findNextTrip(query: NextTripQuery) {
		this.queriedRouteIds.push(query.routeId);
		const options = this.departures[query.routeId] ?? [];

		for (const option of options) {
			const board = combineLocalDateAndClock(option.board, DAY);

			if (board.getTime() >= query.after.getTime()) {
				return trip(query.routeId, option.board, option.alight);
			}
		}

		return null;
	}
}

describe('measureHeadwayLoss', () => {
	it('uses arrival delay after rerunning the chosen path, including later transfers', async () => {
		const route: TransitRoute = {
			provider: 'gtfs',
			routeId: 'gtfs_0',
			totalTimeSeconds: 51 * 60,
			movingTimeSeconds: 51 * 60,
			waitingTimeSeconds: 0,
			walkingTimeSeconds: 11 * 60,
			transferCount: 1,
			departureAt: iso('18:09'),
			arrivalAt: iso('19:00'),
			sections: [
				{
					sequence: 1,
					type: 'walk',
					startPlaceName: '회사',
					endPlaceName: '판교역',
					departureAt: iso('18:09'),
					arrivalAt: iso('18:15'),
					waitingTimeSeconds: 0
				},
				{
					sequence: 2,
					type: 'bus',
					startPlaceName: '판교역',
					endPlaceName: '강남역',
					departureAt: iso('18:15'),
					arrivalAt: iso('18:30'),
					waitingTimeSeconds: 0,
					routeId: '5002'
				},
				{
					sequence: 3,
					type: 'walk',
					startPlaceName: '강남역',
					endPlaceName: '교대역',
					departureAt: iso('18:30'),
					arrivalAt: iso('18:35'),
					waitingTimeSeconds: 0
				},
				{
					sequence: 4,
					type: 'subway',
					startPlaceName: '교대역',
					endPlaceName: '집',
					departureAt: iso('18:40'),
					arrivalAt: iso('19:00'),
					waitingTimeSeconds: 0,
					routeId: '2'
				}
			],
			chosenTrips: [
				{
					routeId: '5002',
					tripId: '5002_A',
					boardTime: iso('18:15'),
					alightTime: iso('18:30')
				},
				{
					routeId: '2',
					tripId: '2_A',
					boardTime: iso('18:40'),
					alightTime: iso('19:00')
				}
			]
		};

		const timetable = new ScriptedTimetable({
			5002: [
				{ board: '18:15', alight: '18:30' },
				{ board: '18:35', alight: '18:50' }
			],
			'2': [
				{ board: '18:40', alight: '19:00' },
				{ board: '19:10', alight: '19:30' }
			],
			5001: [{ board: '18:10', alight: '19:20' }]
		});

		const loss = await measureHeadwayLoss(route, DAY, timetable);

		expect(loss).toEqual({ kind: 'arrivalDelay', delaySeconds: 30 * 60 });
		expect(new Set(timetable.queriedRouteIds)).toEqual(new Set(['5002', '2']));
		expect(headwayLossCopy(loss!)).toBe('1분만 늦어도 30분 늦게 도착했을 거예요.');
	});

	it('uses estimated alternative cost when missing the trip cascades to no later service', async () => {
		const route: TransitRoute = {
			provider: 'gtfs',
			routeId: 'gtfs_0',
			totalTimeSeconds: 900,
			movingTimeSeconds: 800,
			waitingTimeSeconds: 0,
			walkingTimeSeconds: 360,
			transferCount: 0,
			departureAt: iso('18:09'),
			arrivalAt: iso('18:44'),
			sections: [
				{
					sequence: 1,
					type: 'walk',
					startPlaceName: '회사',
					endPlaceName: '판교역',
					departureAt: iso('18:09'),
					arrivalAt: iso('18:15'),
					waitingTimeSeconds: 0
				},
				{
					sequence: 2,
					type: 'bus',
					startPlaceName: '판교역',
					endPlaceName: '강남역',
					departureAt: iso('18:15'),
					arrivalAt: iso('18:40'),
					waitingTimeSeconds: 0,
					routeId: '5002'
				}
			],
			chosenTrips: [
				{
					routeId: '5002',
					tripId: '5002_A',
					boardTime: iso('18:15'),
					alightTime: iso('18:40')
				}
			]
		};

		const timetable = new ScriptedTimetable({
			5002: [{ board: '18:15', alight: '18:40' }]
		});
		const loss = await measureHeadwayLoss(route, DAY, timetable);

		expect(loss).toEqual({
			kind: 'lastTrip',
			routeId: '5002',
			estimatedCostKrw: HEADWAY_ALT_COST_KRW
		});
		expect(headwayLossCopy(loss!)).toBe(
			'막차를 놓쳐 예상 약 15,000원의 추가 비용이 들었을 거예요.'
		);
	});
});

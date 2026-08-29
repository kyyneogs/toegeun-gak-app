import { COMPANY_PLACE, GANGNAM_STATION } from '$lib/adapters/mock/mock-places';
import { MockPlaceProvider } from '$lib/adapters/mock/mock-place-provider';
import { MockRouteProvider } from '$lib/adapters/mock/mock-route-provider';
import { createAppServices } from '$lib/application/composition';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { generateDepartureCandidates } from '$lib/domain/recommendation/candidates';
import {
	buildRecommendation,
	compareCandidates,
	pickBestRoute
} from '$lib/domain/recommendation/engine';
import { REASON_CODES, type ScoredCandidate } from '$lib/domain/recommendation/types';
import type { TransitRoute } from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import { addMinutes, combineLocalDateAndClock, formatClock, toIso } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

function makeRoute(
	clock: string,
	totalMinutes: number,
	waitMinutes: number,
	transferCount = 0
): TransitRoute {
	const departure = combineLocalDateAndClock(clock, DAY);
	const arrival = addMinutes(departure, totalMinutes);

	return {
		provider: 'scripted',
		routeId: `route_${clock}_${transferCount}`,
		totalTimeSeconds: totalMinutes * 60,
		movingTimeSeconds: (totalMinutes - waitMinutes) * 60,
		waitingTimeSeconds: waitMinutes * 60,
		walkingTimeSeconds: 8 * 60,
		transferCount,
		departureAt: toIso(departure),
		arrivalAt: toIso(arrival),
		sections: []
	};
}

class ScriptedRouteProvider implements RouteProvider {
	constructor(private readonly table: Record<string, TransitRoute[]>) {}

	async findRoutes(request: { departureAt: Date }): Promise<TransitRoute[]> {
		return this.table[formatClock(request.departureAt)] ?? [];
	}
}

async function recommendWith(table: Record<string, TransitRoute[]>, desiredArrivalAt?: Date) {
	const services = createAppServices({
		routeProvider: new ScriptedRouteProvider(table)
	});
	const trip = await services.tripService.createTrip({
		origin: COMPANY_PLACE,
		destination: GANGNAM_STATION,
		departureFrom: combineLocalDateAndClock('18:00', DAY),
		departureUntil: combineLocalDateAndClock('19:00', DAY),
		desiredArrivalAt
	});

	return services.recommendationService.recommend({ trip });
}

function stubCandidate(
	partial: Partial<ScoredCandidate> & Pick<ScoredCandidate, 'departureAt' | 'score'>
): ScoredCandidate {
	return {
		expectedArrivalAt: partial.expectedArrivalAt ?? partial.departureAt,
		totalTimeSeconds: partial.totalTimeSeconds ?? 1800,
		waitingTimeSeconds: partial.waitingTimeSeconds ?? 0,
		walkingTimeSeconds: partial.walkingTimeSeconds ?? 480,
		transferCount: partial.transferCount ?? 0,
		route: makeRoute('18:00', 30, 0),
		reasonCodes: partial.reasonCodes ?? [],
		...partial
	};
}

describe('generateDepartureCandidates', () => {
	it('builds 5-minute slots from 18:00 to 19:00', () => {
		const from = combineLocalDateAndClock('18:00', DAY);
		const until = combineLocalDateAndClock('19:00', DAY);
		const slots = generateDepartureCandidates(from, until);

		expect(slots.map(formatClock)).toEqual([
			'18:00',
			'18:05',
			'18:10',
			'18:15',
			'18:20',
			'18:25',
			'18:30',
			'18:35',
			'18:40',
			'18:45',
			'18:50',
			'18:55',
			'19:00'
		]);
	});

	it('builds 10-minute slots when the interval is 10', () => {
		const from = combineLocalDateAndClock('18:00', DAY);
		const until = combineLocalDateAndClock('19:00', DAY);
		const slots = generateDepartureCandidates(from, until, 10);

		expect(slots.map(formatClock)).toEqual([
			'18:00',
			'18:10',
			'18:20',
			'18:30',
			'18:40',
			'18:50',
			'19:00'
		]);
	});
});

describe('recommendation engine', () => {
	it('copies scheduleSource from the recommended route', () => {
		const route = makeRoute('18:10', 34, 4);
		route.scheduleSource = 'gtfs';

		const result = buildRecommendation({
			tripId: 'trip_1',
			windowStart: combineLocalDateAndClock('18:00', DAY),
			windowEnd: combineLocalDateAndClock('19:00', DAY),
			routesByDeparture: [route]
		});

		expect(result.scheduleSource).toBe('gtfs');
	});

	it('picks the shortest total travel time', async () => {
		const result = await recommendWith({
			'18:00': [makeRoute('18:00', 50, 14)],
			'18:10': [makeRoute('18:10', 34, 4)],
			'18:20': [makeRoute('18:20', 48, 11)]
		});

		expect(formatClock(new Date(result.recommended.departureAt))).toBe('18:10');
		expect(result.reasonCodes).toContain(REASON_CODES.SHORT_TOTAL_TRAVEL_TIME);
	});

	it('prefers the earlier slot when travel time is almost the same', async () => {
		const result = await recommendWith({
			'18:10': [makeRoute('18:10', 34, 0)],
			'18:20': [makeRoute('18:20', 35, 0)]
		});

		expect(formatClock(new Date(result.recommended.departureAt))).toBe('18:10');
	});

	it('prefers the earlier slot when efficiency is equal', async () => {
		const result = await recommendWith({
			'18:10': [makeRoute('18:10', 35, 4)],
			'18:50': [makeRoute('18:50', 35, 4)]
		});

		expect(formatClock(new Date(result.recommended.departureAt))).toBe('18:10');
	});

	it('keeps the earlier departure when the later option has a large time penalty', async () => {
		const result = await recommendWith({
			'18:10': [makeRoute('18:10', 34, 0)],
			'18:20': [makeRoute('18:20', 48, 14)]
		});

		expect(formatClock(new Date(result.recommended.departureAt))).toBe('18:10');
	});

	it('prefers fewer transfers when total time is equal', async () => {
		const result = await recommendWith({
			'18:00': [makeRoute('18:00', 40, 4, 0)],
			'18:10': [makeRoute('18:10', 40, 4, 1)]
		});

		expect(formatClock(new Date(result.recommended.departureAt))).toBe('18:00');
		expect(result.recommended.transferCount).toBe(0);
		expect(result.reasonCodes).toContain(REASON_CODES.FEWER_TRANSFERS);
	});

	it('picks the zero-transfer route in the same slot', () => {
		const selected = pickBestRoute([makeRoute('18:00', 40, 4, 1), makeRoute('18:00', 40, 4, 0)]);

		expect(selected?.transferCount).toBe(0);
	});

	it('throws ROUTE_NOT_FOUND when no buses are running', async () => {
		await expect(recommendWith({})).rejects.toMatchObject({
			code: ERROR_CODES.ROUTE_NOT_FOUND
		} satisfies Partial<AppError>);
	});

	it('drops candidates that miss the desired arrival time', async () => {
		const result = await recommendWith(
			{
				'18:10': [makeRoute('18:10', 34, 4)],
				'18:20': [makeRoute('18:20', 35, 1)]
			},
			combineLocalDateAndClock('18:50', DAY)
		);

		expect(formatClock(new Date(result.recommended.departureAt))).toBe('18:10');
		expect(result.alternatives).toHaveLength(1);
	});

	it('throws RECOMMENDATION_UNAVAILABLE when every candidate misses the arrival time', async () => {
		await expect(
			recommendWith(
				{
					'18:10': [makeRoute('18:10', 34, 4)],
					'18:20': [makeRoute('18:20', 35, 1)]
				},
				combineLocalDateAndClock('18:20', DAY)
			)
		).rejects.toMatchObject({
			code: ERROR_CODES.RECOMMENDATION_UNAVAILABLE
		} satisfies Partial<AppError>);
	});

	it('breaks identical scores by earlier departure', () => {
		const earlier = stubCandidate({
			departureAt: toIso(combineLocalDateAndClock('18:10', DAY)),
			score: 0.5
		});
		const later = stubCandidate({
			departureAt: toIso(combineLocalDateAndClock('18:20', DAY)),
			score: 0.5
		});

		expect(compareCandidates(earlier, later)).toBeLessThan(0);
	});
});

describe('MockRouteProvider', () => {
	it('reproduces long wait at 18:00 and short wait at 18:10', async () => {
		const provider = new MockRouteProvider({ delayMs: 0 });
		const origin = {
			name: COMPANY_PLACE.name,
			latitude: COMPANY_PLACE.latitude,
			longitude: COMPANY_PLACE.longitude
		};
		const destination = {
			name: GANGNAM_STATION.name,
			latitude: GANGNAM_STATION.latitude,
			longitude: GANGNAM_STATION.longitude
		};

		const [six] = await provider.findRoutes({
			origin,
			destination,
			departureAt: combineLocalDateAndClock('18:00', DAY)
		});
		const [ten] = await provider.findRoutes({
			origin,
			destination,
			departureAt: combineLocalDateAndClock('18:10', DAY)
		});

		expect(six.waitingTimeSeconds).toBe(14 * 60);
		expect(ten.waitingTimeSeconds).toBe(4 * 60);
		expect(ten.totalTimeSeconds).toBeLessThan(six.totalTimeSeconds);
	});

	it('returns no route after the last bus', async () => {
		const provider = new MockRouteProvider({ delayMs: 0, lastBusClock: '18:00' });
		const routes = await provider.findRoutes({
			origin: {
				name: COMPANY_PLACE.name,
				latitude: COMPANY_PLACE.latitude,
				longitude: COMPANY_PLACE.longitude
			},
			destination: {
				name: GANGNAM_STATION.name,
				latitude: GANGNAM_STATION.latitude,
				longitude: GANGNAM_STATION.longitude
			},
			departureAt: combineLocalDateAndClock('22:00', DAY)
		});

		expect(routes).toEqual([]);
	});
});

describe('MockPlaceProvider', () => {
	it('finds 강남역 by keyword', async () => {
		const provider = new MockPlaceProvider();
		const results = await provider.search('강남');

		expect(results.map((place) => place.name)).toContain('강남역');
	});
});

describe('end-to-end mock recommendation', () => {
	it('recommends the earliest equally efficient slot over leaving at 18:00', async () => {
		const services = createAppServices({
			routeProvider: new MockRouteProvider({ delayMs: 0 })
		});
		const trip = await services.tripService.createTrip({
			origin: COMPANY_PLACE,
			destination: GANGNAM_STATION,
			departureFrom: combineLocalDateAndClock('18:00', DAY),
			departureUntil: combineLocalDateAndClock('19:00', DAY)
		});
		const result = await services.recommendationService.recommend({ trip });
		const explanation = await services.explanationService.explain(result, {
			originName: trip.origin.name,
			destinationName: trip.destination.name
		});
		const eighteen = result.alternatives.find(
			(candidate) => formatClock(new Date(candidate.departureAt)) === '18:00'
		);

		expect(formatClock(new Date(result.recommended.departureAt))).toBe('18:10');
		expect(result.recommended.waitingTimeSeconds).toBe(4 * 60);
		expect(eighteen?.waitingTimeSeconds).toBe(14 * 60);
		expect(result.recommended.totalTimeSeconds).toBeLessThan(
			eighteen?.totalTimeSeconds ?? Infinity
		);
		expect(explanation.summary.length).toBeGreaterThan(0);
		expect(explanation.details[0]).toContain('18:10');
	});
});

import { COMPANY_PLACE, GANGNAM_STATION } from '$lib/adapters/mock/mock-places';
import { RecommendationApplicationService } from '$lib/application/recommendation/recommendation-service';
import { TripApplicationService } from '$lib/application/trip/trip-service';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import type { TransitRoute } from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import { addMinutes, combineLocalDateAndClock, formatClock, toIso } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

function makeRoute(clock: string, totalMinutes: number): TransitRoute {
	const departure = combineLocalDateAndClock(clock, DAY);
	const arrival = addMinutes(departure, totalMinutes);

	return {
		provider: 'scripted',
		routeId: `route_${clock}`,
		totalTimeSeconds: totalMinutes * 60,
		movingTimeSeconds: totalMinutes * 60,
		waitingTimeSeconds: 0,
		walkingTimeSeconds: 8 * 60,
		transferCount: 0,
		departureAt: toIso(departure),
		arrivalAt: toIso(arrival),
		sections: []
	};
}

class ScriptedRouteProvider implements RouteProvider {
	inFlight = 0;
	maxInFlight = 0;
	clocks: string[] = [];

	constructor(
		private readonly table: Record<string, TransitRoute[]>,
		private readonly rateLimitAt?: string
	) {}

	async findRoutes(request: { departureAt: Date }): Promise<TransitRoute[]> {
		this.inFlight += 1;
		this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
		const clock = formatClock(request.departureAt);
		this.clocks.push(clock);
		await delay(5);
		this.inFlight -= 1;

		if (this.rateLimitAt && clock === this.rateLimitAt) {
			throw new AppError(ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT);
		}

		return this.table[clock] ?? [];
	}
}

async function recommendWith(
	provider: RouteProvider,
	resolveSlotIntervalMinutes?: () => Promise<number>
) {
	const tripService = new TripApplicationService();
	const recommendationService = new RecommendationApplicationService(provider, {
		resolveSlotIntervalMinutes
	});
	const trip = await tripService.createTrip({
		origin: COMPANY_PLACE,
		destination: GANGNAM_STATION,
		departureFrom: combineLocalDateAndClock('18:00', DAY),
		departureUntil: combineLocalDateAndClock('19:00', DAY)
	});

	return recommendationService.recommend({ trip });
}

describe('RecommendationApplicationService', () => {
	it('looks up slots one at a time', async () => {
		const provider = new ScriptedRouteProvider({
			'18:00': [makeRoute('18:00', 40)]
		});

		await recommendWith(provider);

		expect(provider.maxInFlight).toBe(1);
	});

	it('recommends from slots collected before a rate limit', async () => {
		const provider = new ScriptedRouteProvider(
			{
				'18:00': [makeRoute('18:00', 50)],
				'18:05': [makeRoute('18:05', 30)]
			},
			'18:10'
		);

		const result = await recommendWith(provider);

		expect(formatClock(new Date(result.recommended.departureAt))).toBe('18:05');
		expect(provider.clocks.includes('18:15')).toBe(false);
	});

	it('throws rate-limit when no slot succeeded before 429', async () => {
		const provider = new ScriptedRouteProvider({}, '18:00');

		try {
			await recommendWith(provider);
			expect.fail('should throw');
		} catch (error) {
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).code).toBe(ERROR_CODES.ROUTE_PROVIDER_RATE_LIMIT);
		}
	});

	it('uses 10-minute slots when the resolver returns a custom interval', async () => {
		const provider = new ScriptedRouteProvider({
			'18:00': [makeRoute('18:00', 40)]
		});

		await recommendWith(provider, async () => 10);

		expect(provider.clocks).toEqual([
			'18:00',
			'18:10',
			'18:20',
			'18:30',
			'18:40',
			'18:50',
			'19:00'
		]);
	});

	it('attaches a live route without mixing it into slot scores', async () => {
		const live = makeRoute('17:50', 40);
		live.provider = 'kakao';
		const provider: RouteProvider = {
			findLiveRoute: async () => live,
			findRoutes: async (request) => {
				const clock = formatClock(request.departureAt);
				return [makeRoute(clock, 30)];
			}
		};

		const result = await recommendWith(provider);

		expect(result.liveRoute?.provider).toBe('kakao');
		expect(result.recommended.route.provider).toBe('scripted');
	});
});

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

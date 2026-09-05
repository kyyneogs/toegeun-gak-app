import { HttpRecommendationService } from '$lib/adapters/http/http-recommendation-service';
import { COMPANY_PLACE, GANGNAM_STATION } from '$lib/adapters/mock/mock-places';
import { TripApplicationService } from '$lib/application/trip/trip-service';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { combineLocalDateAndClock } from '$lib/utils/time';
import { describe, expect, it } from 'vitest';

const DAY = new Date(2026, 7, 29);

describe('HttpRecommendationService', () => {
	it('posts the trip to /api/recommend and returns the payload', async () => {
		const trip = await new TripApplicationService().createTrip({
			origin: COMPANY_PLACE,
			destination: GANGNAM_STATION,
			departureFrom: combineLocalDateAndClock('18:00', DAY)
		});
		const fetchImpl: typeof fetch = async (input, init) => {
			expect(String(input)).toBe('/api/recommend');
			expect(init?.method).toBe('POST');
			return new Response(
				JSON.stringify({
					id: 'rec_1',
					tripId: trip.id,
					recommended: {
						departureAt: trip.departureFrom,
						expectedArrivalAt: trip.departureFrom,
						totalTimeSeconds: 60,
						waitingTimeSeconds: 0,
						walkingTimeSeconds: 0,
						transferCount: 0,
						route: {
							provider: 'gtfs',
							routeId: 'r1',
							totalTimeSeconds: 60,
							movingTimeSeconds: 60,
							waitingTimeSeconds: 0,
							walkingTimeSeconds: 0,
							transferCount: 0,
							departureAt: trip.departureFrom,
							arrivalAt: trip.departureFrom,
							sections: []
						},
						chosenTrips: [],
						headwayLoss: null
					},
					criterion: 'earliestArrival',
					mode: 'leaveAfter',
					alternatives: [],
					naiveArrivalAt: trip.departureFrom,
					calculatedAt: trip.createdAt
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		};

		const result = await new HttpRecommendationService(fetchImpl).recommend({ trip });
		expect(result.id).toBe('rec_1');
		expect(result.criterion).toBe('earliestArrival');
	});

	it('maps a missed arrive-by to RECOMMENDATION_UNAVAILABLE', async () => {
		const trip = await new TripApplicationService().createTrip({
			origin: COMPANY_PLACE,
			destination: GANGNAM_STATION,
			departureFrom: combineLocalDateAndClock('18:00', DAY)
		});
		const fetchImpl: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					code: ERROR_CODES.RECOMMENDATION_UNAVAILABLE,
					message: 'missed'
				}),
				{ status: 404, headers: { 'Content-Type': 'application/json' } }
			);

		try {
			await new HttpRecommendationService(fetchImpl).recommend({ trip });
			expect.fail('should throw');
		} catch (error) {
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).code).toBe(ERROR_CODES.RECOMMENDATION_UNAVAILABLE);
		}
	});

	it('maps a non-JSON gateway timeout to ROUTE_PROVIDER_TIMEOUT', async () => {
		const trip = await new TripApplicationService().createTrip({
			origin: COMPANY_PLACE,
			destination: GANGNAM_STATION,
			departureFrom: combineLocalDateAndClock('18:00', DAY)
		});
		const fetchImpl: typeof fetch = async () =>
			new Response('<html>timeout</html>', {
				status: 504,
				headers: { 'Content-Type': 'text/html' }
			});

		try {
			await new HttpRecommendationService(fetchImpl).recommend({ trip });
			expect.fail('should throw');
		} catch (error) {
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).code).toBe(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT);
		}
	});
});

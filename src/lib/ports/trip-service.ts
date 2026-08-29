import type { CreateTripInput, Trip } from '$lib/domain/trip/trip';

export interface TripService {
	createTrip(input: CreateTripInput): Promise<Trip>;
}

import type { Place } from '$lib/domain/place/place';

export type TripStatus = 'draft' | 'calculated';

export interface Trip {
	id: string;
	origin: Place;
	destination: Place;
	departureFrom: string;
	departureUntil: string;
	desiredArrivalAt?: string;
	status: TripStatus;
	createdAt: string;
	updatedAt: string;
}

export interface CreateTripInput {
	origin: Place;
	destination: Place;
	departureFrom: Date;
	departureUntil?: Date;
	desiredArrivalAt?: Date;
}

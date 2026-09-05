import { ERROR_CODES, ERROR_DEPARTURE_WINDOW, ERROR_DESIRED_ARRIVAL } from '$lib/constants/errors';
import { DEFAULT_DEPARTURE_WINDOW_MINUTES } from '$lib/constants/recommendation';
import { AppError } from '$lib/domain/errors';
import type { CreateTripInput, Trip } from '$lib/domain/trip/trip';
import type { TripService } from '$lib/ports/trip-service';
import { createId } from '$lib/utils/id';
import { addMinutes, toIso } from '$lib/utils/time';

export class TripApplicationService implements TripService {
	async createTrip(input: CreateTripInput): Promise<Trip> {
		if (!input.origin || !input.destination) {
			throw new AppError(ERROR_CODES.INVALID_PLACE);
		}

		if (
			!Number.isFinite(input.origin.latitude) ||
			!Number.isFinite(input.origin.longitude) ||
			!Number.isFinite(input.destination.latitude) ||
			!Number.isFinite(input.destination.longitude)
		) {
			throw new AppError(ERROR_CODES.INVALID_PLACE);
		}

		if (Number.isNaN(input.departureFrom.getTime())) {
			throw new AppError(ERROR_CODES.INVALID_REQUEST);
		}

		const departureUntil =
			input.departureUntil ?? addMinutes(input.departureFrom, DEFAULT_DEPARTURE_WINDOW_MINUTES);

		if (departureUntil.getTime() < input.departureFrom.getTime()) {
			throw new AppError(ERROR_CODES.INVALID_REQUEST, ERROR_DEPARTURE_WINDOW);
		}

		if (
			input.desiredArrivalAt &&
			input.desiredArrivalAt.getTime() <= input.departureFrom.getTime()
		) {
			throw new AppError(ERROR_CODES.INVALID_REQUEST, ERROR_DESIRED_ARRIVAL);
		}

		const now = toIso(new Date());

		return {
			id: createId('trip'),
			origin: input.origin,
			destination: input.destination,
			departureFrom: toIso(input.departureFrom),
			departureUntil: toIso(departureUntil),
			desiredArrivalAt: input.desiredArrivalAt ? toIso(input.desiredArrivalAt) : undefined,
			status: 'draft',
			createdAt: now,
			updatedAt: now
		};
	}
}

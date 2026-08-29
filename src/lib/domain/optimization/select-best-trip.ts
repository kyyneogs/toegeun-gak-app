import type { TransitSegment, TripChoice } from '$lib/domain/optimization/types';
import type { TimetablePort } from '$lib/ports/timetable-port';

export interface SelectBestTripInput {
	segment: TransitSegment;
	after: Date;
	serviceDate: Date;
}

export async function selectBestGtfsTrip(
	timetable: TimetablePort,
	input: SelectBestTripInput
): Promise<TripChoice | null> {
	const choices = await Promise.all(
		input.segment.candidateRouteIds.map((routeId) =>
			timetable.findNextTrip({
				routeId,
				boardStopName: input.segment.stopId,
				alightStopName: input.segment.alightStopId,
				after: input.after,
				serviceDate: input.serviceDate
			})
		)
	);

	let best: TripChoice | null = null;

	for (const choice of choices) {
		if (!choice) {
			continue;
		}

		if (!best || choice.alightTime.getTime() < best.alightTime.getTime()) {
			best = choice;
		}
	}

	return best;
}

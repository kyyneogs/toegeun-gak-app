import { selectBestGtfsTrip } from '$lib/domain/optimization/select-best-trip';
import type { RecalculatedRoute, TopologyRoute } from '$lib/domain/optimization/types';
import type { TimetablePort } from '$lib/ports/timetable-port';
import { addSeconds } from '$lib/utils/time';

export async function recalculateRoute(
	topology: TopologyRoute,
	desiredDepartureAfter: Date,
	serviceDate: Date,
	timetable: TimetablePort,
	routeIndex = 0
): Promise<RecalculatedRoute> {
	let currentTime = desiredDepartureAfter;
	const chosenTrips = [];

	for (const [segmentIndex, segment] of topology.segments.entries()) {
		if (segment.type === 'WALK') {
			currentTime = addSeconds(currentTime, segment.duration);
			continue;
		}

		const chosen = await selectBestGtfsTrip(timetable, {
			segment,
			after: currentTime,
			serviceDate
		});

		if (!chosen) {
			return {
				segments: topology.segments,
				invalid: true,
				finalArrivalTime: null,
				chosenTrips,
				failure: {
					routeIndex,
					segmentIndex,
					stopName: segment.stopId,
					candidateRouteIds: segment.candidateRouteIds,
					reason: 'NO_TRIP_AFTER'
				}
			};
		}

		chosenTrips.push(chosen);
		currentTime = chosen.alightTime;
	}

	return {
		segments: topology.segments,
		invalid: false,
		finalArrivalTime: currentTime,
		chosenTrips,
		failure: null
	};
}

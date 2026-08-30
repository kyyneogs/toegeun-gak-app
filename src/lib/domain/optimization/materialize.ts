import type { RecalculatedRoute, Segment, TripChoice } from '$lib/domain/optimization/types';
import { standupAt } from '$lib/domain/optimization/standup';
import type { ChosenTrip, RouteSection, TransitRoute } from '$lib/domain/route/route';
import { addSeconds, secondsBetween, toIso } from '$lib/utils/time';

export function materializeOptimizedRoute(
	route: RecalculatedRoute,
	earliestLeaveAt: Date,
	routeId: string,
	options: { alignWalkToBoard?: boolean } = {}
): TransitRoute | null {
	if (route.invalid || !route.finalArrivalTime) {
		return null;
	}

	const alignWalkToBoard = options.alignWalkToBoard !== false;
	const walkStart = alignWalkToBoard ? standupAt(route, earliestLeaveAt) : earliestLeaveAt;
	const sections: RouteSection[] = [];
	let cursor = walkStart;
	let waitingTimeSeconds = 0;
	let walkingTimeSeconds = 0;
	let movingTimeSeconds = 0;
	let sequence = 1;
	let tripIndex = 0;

	for (const segment of route.segments) {
		if (segment.type === 'WALK') {
			const arrivalAt = addSeconds(cursor, segment.duration);
			sections.push(walkSection(segment, sequence, cursor, arrivalAt));
			sequence += 1;
			movingTimeSeconds += segment.duration;
			walkingTimeSeconds += segment.duration;
			cursor = arrivalAt;
			continue;
		}

		const trip = route.chosenTrips[tripIndex];
		tripIndex += 1;

		if (!trip) {
			return null;
		}

		const waitSeconds = secondsBetween(cursor, trip.boardTime);

		if (waitSeconds > 0) {
			sections.push({
				sequence,
				type: 'wait',
				startPlaceName: segment.startPlaceName,
				endPlaceName: segment.startPlaceName,
				departureAt: toIso(cursor),
				arrivalAt: toIso(trip.boardTime),
				waitingTimeSeconds: waitSeconds
			});
			sequence += 1;
			waitingTimeSeconds += waitSeconds;
		}

		const rideSeconds = secondsBetween(trip.boardTime, trip.alightTime);
		sections.push(transitSection(segment, sequence, trip));
		sequence += 1;
		movingTimeSeconds += rideSeconds;
		cursor = trip.alightTime;
	}

	const transitCount = route.segments.filter((segment) => segment.type !== 'WALK').length;

	return {
		provider: 'gtfs',
		routeId,
		totalTimeSeconds: secondsBetween(walkStart, route.finalArrivalTime),
		movingTimeSeconds,
		waitingTimeSeconds,
		walkingTimeSeconds,
		transferCount: Math.max(0, transitCount - 1),
		departureAt: toIso(walkStart),
		arrivalAt: toIso(route.finalArrivalTime),
		sections,
		scheduleSource: 'gtfs',
		chosenTrips: route.chosenTrips.map(toChosenTrip)
	};
}

function walkSection(
	segment: Extract<Segment, { type: 'WALK' }>,
	sequence: number,
	departureAt: Date,
	arrivalAt: Date
): RouteSection {
	return {
		sequence,
		type: 'walk',
		startPlaceName: segment.startPlaceName,
		endPlaceName: segment.endPlaceName,
		departureAt: toIso(departureAt),
		arrivalAt: toIso(arrivalAt),
		waitingTimeSeconds: 0
	};
}

function transitSection(
	segment: Extract<Segment, { type: 'BUS' | 'SUBWAY' }>,
	sequence: number,
	trip: TripChoice
): RouteSection {
	return {
		sequence,
		type: segment.type === 'BUS' ? 'bus' : 'subway',
		startPlaceName: segment.startPlaceName,
		endPlaceName: segment.endPlaceName,
		departureAt: toIso(trip.boardTime),
		arrivalAt: toIso(trip.alightTime),
		waitingTimeSeconds: 0,
		routeId: trip.routeId,
		routeName: trip.routeId,
		vehicleType: segment.type === 'BUS' ? 'bus' : 'subway'
	};
}

function toChosenTrip(trip: TripChoice): ChosenTrip {
	return {
		routeId: trip.routeId,
		tripId: trip.tripId,
		boardTime: toIso(trip.boardTime),
		alightTime: toIso(trip.alightTime)
	};
}

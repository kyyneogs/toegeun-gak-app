import type { RecalculatedRoute } from '$lib/domain/optimization/types';
import { addSeconds } from '$lib/utils/time';

export function standupAt(route: RecalculatedRoute, earliestLeaveAt: Date): Date {
	const firstWalk = route.segments[0]?.type === 'WALK' ? route.segments[0] : null;
	const firstTrip = route.chosenTrips[0];

	if (!firstWalk) {
		return firstTrip?.boardTime ?? earliestLeaveAt;
	}

	if (!firstTrip) {
		return earliestLeaveAt;
	}

	const justInTime = addSeconds(firstTrip.boardTime, -firstWalk.duration);

	if (justInTime.getTime() > earliestLeaveAt.getTime()) {
		return justInTime;
	}

	return earliestLeaveAt;
}

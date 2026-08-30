import { HEADWAY_ALT_COST_KRW, HEADWAY_MISS_SECONDS } from '$lib/constants/recommendation';
import { topologyFromChosenRoute } from '$lib/domain/optimization/topology-from-chosen';
import { recalculateRoute } from '$lib/domain/optimization/recalculate-route';
import type { HeadwayLoss, TransitRoute } from '$lib/domain/route/route';
import type { TimetablePort } from '$lib/ports/timetable-port';
import { addSeconds, formatDurationMinutes, fromIso, secondsBetween } from '$lib/utils/time';

export async function measureHeadwayLoss(
	route: TransitRoute,
	serviceDate: Date,
	timetable: TimetablePort
): Promise<HeadwayLoss | null> {
	const topology = topologyFromChosenRoute(route);
	const firstTrip = route.chosenTrips?.[0];

	if (!topology || !firstTrip) {
		return null;
	}

	const missedLeaveAt = addSeconds(fromIso(route.departureAt), HEADWAY_MISS_SECONDS);
	const missed = await recalculateRoute(topology, missedLeaveAt, serviceDate, timetable);

	if (missed.invalid || !missed.finalArrivalTime) {
		return {
			kind: 'lastTrip',
			routeId: firstTrip.routeId,
			estimatedCostKrw: HEADWAY_ALT_COST_KRW
		};
	}

	const delaySeconds = secondsBetween(fromIso(route.arrivalAt), missed.finalArrivalTime);

	if (delaySeconds <= 0) {
		return null;
	}

	return { kind: 'arrivalDelay', delaySeconds };
}

export function headwayLossCopy(loss: HeadwayLoss): string {
	if (loss.kind === 'lastTrip') {
		return `막차를 놓쳐 예상 약 ${formatWon(loss.estimatedCostKrw)}의 추가 비용이 들었을 거예요.`;
	}

	return `1분만 늦어도 ${formatDurationMinutes(loss.delaySeconds)} 늦게 도착했을 거예요.`;
}

function formatWon(amount: number): string {
	return `${amount.toLocaleString('ko-KR')}원`;
}

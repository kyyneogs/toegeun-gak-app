import {
	HEADWAY_ALT_COST_KRW,
	HEADWAY_DELAY_SUPPORT,
	HEADWAY_LAST_TRAIN_SUPPORT,
	HEADWAY_MISS_SECONDS
} from '$lib/constants/recommendation';
import { topologyFromChosenRoute } from '$lib/domain/optimization/topology-from-chosen';
import { recalculateRoute } from '$lib/domain/optimization/recalculate-route';
import type { HeadwayLoss, TransitRoute } from '$lib/domain/route/route';
import type { TimetablePort } from '$lib/ports/timetable-port';
import { addSeconds, formatDurationMinutes, fromIso, secondsBetween } from '$lib/utils/time';

export interface HeadwayLossDisplay {
	targetValue: number;
	support: string;
	tone: 'delay' | 'danger';
}

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
		return `막차를 놓칠 수 있어요. 택시는 약 ${formatWon(loss.estimatedCostKrw)} 예상이에요.`;
	}

	return `집에 ${formatDurationMinutes(loss.delaySeconds)} 늦게 도착해요.`;
}

export function headwayLossDisplay(loss: HeadwayLoss): HeadwayLossDisplay {
	if (loss.kind === 'lastTrip') {
		return {
			targetValue: loss.estimatedCostKrw,
			support: HEADWAY_LAST_TRAIN_SUPPORT,
			tone: 'danger'
		};
	}

	return {
		targetValue: Math.round(loss.delaySeconds / 60),
		support: HEADWAY_DELAY_SUPPORT,
		tone: 'delay'
	};
}

export function formatHeadwayLossFigure(loss: HeadwayLoss, value: number): string {
	if (loss.kind === 'lastTrip') {
		return `약 ${formatWon(value)}`;
	}

	return `+${value}분`;
}

function formatWon(amount: number): string {
	return `${amount.toLocaleString('ko-KR')}원`;
}

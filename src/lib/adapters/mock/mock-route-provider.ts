import {
	HEADWAY_ALT_COST_KRW,
	MOCK_BUS_INTERVAL_MINUTES,
	MOCK_BUS_RIDE_MINUTES,
	MOCK_FIRST_BUS,
	MOCK_LAST_BUS,
	MOCK_ROUTE_LOOKUP_DELAY_MS,
	MOCK_ROUTE_NAME,
	MOCK_WALK_TO_DEST_MINUTES,
	MOCK_WALK_TO_STOP_MINUTES
} from '$lib/constants/recommendation';
import { nextBusAt } from '$lib/domain/route/headway';
import type {
	HeadwayLoss,
	RouteRequest,
	RouteSection,
	TransitRoute
} from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import { createId } from '$lib/utils/id';
import {
	addMinutes,
	addSeconds,
	combineLocalDateAndClock,
	secondsBetween,
	toIso
} from '$lib/utils/time';

export interface MockRouteProviderOptions {
	delayMs?: number;
	walkToStopMinutes?: number;
	busRideMinutes?: number;
	walkToDestMinutes?: number;
	busIntervalMinutes?: number;
	firstBusClock?: string;
	lastBusClock?: string;
	routeName?: string;
}

function wait(ms: number): Promise<void> {
	if (ms <= 0) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export class MockRouteProvider implements RouteProvider {
	private readonly delayMs: number;
	private readonly walkToStopMinutes: number;
	private readonly busRideMinutes: number;
	private readonly walkToDestMinutes: number;
	private readonly busIntervalMinutes: number;
	private readonly firstBusClock: string;
	private readonly lastBusClock: string;
	private readonly routeName: string;

	constructor(options: MockRouteProviderOptions = {}) {
		this.delayMs = options.delayMs ?? MOCK_ROUTE_LOOKUP_DELAY_MS;
		this.walkToStopMinutes = options.walkToStopMinutes ?? MOCK_WALK_TO_STOP_MINUTES;
		this.busRideMinutes = options.busRideMinutes ?? MOCK_BUS_RIDE_MINUTES;
		this.walkToDestMinutes = options.walkToDestMinutes ?? MOCK_WALK_TO_DEST_MINUTES;
		this.busIntervalMinutes = options.busIntervalMinutes ?? MOCK_BUS_INTERVAL_MINUTES;
		this.firstBusClock = options.firstBusClock ?? MOCK_FIRST_BUS;
		this.lastBusClock = options.lastBusClock ?? MOCK_LAST_BUS;
		this.routeName = options.routeName ?? MOCK_ROUTE_NAME;
	}

	async findRoutes(request: RouteRequest): Promise<TransitRoute[]> {
		await wait(this.delayMs);

		const leaveAt = request.departureAt;
		const arriveAtStop = addMinutes(leaveAt, this.walkToStopMinutes);
		const firstBus = combineLocalDateAndClock(this.firstBusClock, leaveAt);
		const lastBus = combineLocalDateAndClock(this.lastBusClock, leaveAt);
		const busDeparture = nextBusAt(arriveAtStop, firstBus, lastBus, this.busIntervalMinutes);

		if (!busDeparture) {
			return [];
		}

		const waitMinutes = Math.round((busDeparture.getTime() - arriveAtStop.getTime()) / 60000);
		const busArrival = addMinutes(busDeparture, this.busRideMinutes);
		const destArrival = addMinutes(busArrival, this.walkToDestMinutes);
		const walkingTimeSeconds = (this.walkToStopMinutes + this.walkToDestMinutes) * 60;
		const waitingTimeSeconds = waitMinutes * 60;
		const movingTimeSeconds = walkingTimeSeconds + this.busRideMinutes * 60;
		const totalTimeSeconds = secondsBetween(leaveAt, destArrival);
		const originStop = `${request.origin.name} 정류장`;
		const destinationStop = `${request.destination.name} 정류장`;

		const sections: RouteSection[] = [
			{
				sequence: 1,
				type: 'walk',
				startPlaceName: request.origin.name,
				endPlaceName: originStop,
				departureAt: toIso(leaveAt),
				arrivalAt: toIso(arriveAtStop),
				waitingTimeSeconds: 0
			},
			{
				sequence: 2,
				type: 'wait',
				startPlaceName: originStop,
				endPlaceName: originStop,
				departureAt: toIso(arriveAtStop),
				arrivalAt: toIso(busDeparture),
				waitingTimeSeconds
			},
			{
				sequence: 3,
				type: 'bus',
				startPlaceName: originStop,
				endPlaceName: destinationStop,
				departureAt: toIso(busDeparture),
				arrivalAt: toIso(busArrival),
				waitingTimeSeconds: 0,
				routeId: this.routeName,
				routeName: `${this.routeName}번`,
				vehicleType: 'bus'
			},
			{
				sequence: 4,
				type: 'walk',
				startPlaceName: destinationStop,
				endPlaceName: request.destination.name,
				departureAt: toIso(busArrival),
				arrivalAt: toIso(destArrival),
				waitingTimeSeconds: 0
			}
		];

		return [
			{
				provider: 'mock',
				routeId: createId('route'),
				totalTimeSeconds,
				movingTimeSeconds,
				waitingTimeSeconds,
				walkingTimeSeconds,
				transferCount: 0,
				departureAt: toIso(leaveAt),
				arrivalAt: toIso(destArrival),
				sections,
				headwayLoss: mockHeadwayLoss({
					routeId: this.routeName,
					destArrival,
					busDeparture,
					firstBus,
					lastBus,
					intervalMinutes: this.busIntervalMinutes,
					busRideMinutes: this.busRideMinutes,
					walkToDestMinutes: this.walkToDestMinutes
				})
			}
		];
	}
}

function mockHeadwayLoss(options: {
	routeId: string;
	destArrival: Date;
	busDeparture: Date;
	firstBus: Date;
	lastBus: Date;
	intervalMinutes: number;
	busRideMinutes: number;
	walkToDestMinutes: number;
}): HeadwayLoss | null {
	const nextBus = nextBusAt(
		addSeconds(options.busDeparture, 1),
		options.firstBus,
		options.lastBus,
		options.intervalMinutes
	);

	if (!nextBus) {
		return {
			kind: 'lastTrip',
			routeId: options.routeId,
			estimatedCostKrw: HEADWAY_ALT_COST_KRW
		};
	}

	const missedArrival = addMinutes(
		addMinutes(nextBus, options.busRideMinutes),
		options.walkToDestMinutes
	);
	const delaySeconds = secondsBetween(options.destArrival, missedArrival);

	if (delaySeconds <= 0) {
		return null;
	}

	return { kind: 'arrivalDelay', delaySeconds };
}

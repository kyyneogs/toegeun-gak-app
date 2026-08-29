import type { ScheduleSource } from '$lib/domain/route/timetable';

export type RouteSectionType = 'walk' | 'bus' | 'subway' | 'wait';

export interface RouteSection {
	sequence: number;
	type: RouteSectionType;
	startPlaceName: string;
	endPlaceName: string;
	departureAt: string;
	arrivalAt: string;
	waitingTimeSeconds: number;
	routeId?: string;
	routeName?: string;
	vehicleType?: string;
}

export interface TransitRoute {
	provider: string;
	routeId: string;
	totalTimeSeconds: number;
	movingTimeSeconds: number;
	waitingTimeSeconds: number;
	walkingTimeSeconds: number;
	transferCount: number;
	departureAt: string;
	arrivalAt: string;
	sections: RouteSection[];
	scheduleSource?: ScheduleSource;
}

export interface RouteRequest {
	origin: {
		name: string;
		latitude: number;
		longitude: number;
	};
	destination: {
		name: string;
		latitude: number;
		longitude: number;
	};
	departureAt: Date;
}

export interface RouteSearchOptions {
	maxTransfers?: number;
}

export interface WalkSegment {
	type: 'WALK';
	duration: number;
	startPlaceName: string;
	endPlaceName: string;
}

export interface TransitSegment {
	type: 'BUS' | 'SUBWAY';
	stopId: string;
	alightStopId: string;
	candidateRouteIds: string[];
	startPlaceName: string;
	endPlaceName: string;
}

export type Segment = WalkSegment | TransitSegment;

export interface TopologyRoute {
	segments: Segment[];
}

export interface TripChoice {
	routeId: string;
	tripId: string;
	boardTime: Date;
	alightTime: Date;
}

export interface RouteFailure {
	routeIndex: number;
	segmentIndex: number;
	stopName: string;
	candidateRouteIds: string[];
	reason: string;
}

export interface RecalculatedRoute {
	segments: Segment[];
	invalid: boolean;
	finalArrivalTime: Date | null;
	chosenTrips: TripChoice[];
	failure: RouteFailure | null;
}

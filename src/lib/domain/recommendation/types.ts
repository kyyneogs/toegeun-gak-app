import type { ChosenTrip, HeadwayLoss, TransitRoute } from '$lib/domain/route/route';
import type { ScheduleSource } from '$lib/domain/route/timetable';
import type { Trip } from '$lib/domain/trip/trip';

export interface RecommendedRoute {
	departureAt: string;
	expectedArrivalAt: string;
	totalTimeSeconds: number;
	waitingTimeSeconds: number;
	walkingTimeSeconds: number;
	transferCount: number;
	route: TransitRoute;
	chosenTrips: ChosenTrip[];
	headwayLoss: HeadwayLoss | null;
}

export interface RecommendationResult {
	id: string;
	tripId: string;
	recommended: RecommendedRoute;
	calculatedAt: string;
	liveRoute?: TransitRoute | null;
	scheduleSource?: ScheduleSource;
}

export interface RecommendationInput {
	trip: Trip;
}

export interface RecommendationExplanation {
	summary: string;
	details: string[];
}

export interface ExplanationContext {
	originName: string;
	destinationName: string;
}

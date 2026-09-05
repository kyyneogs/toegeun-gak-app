import type { ChosenTrip, HeadwayLoss, TransitRoute } from '$lib/domain/route/route';
import type { ScheduleSource } from '$lib/domain/route/timetable';
import type { RecommendationMode, RouteCriterion } from '$lib/domain/recommendation/criteria';
import type { Trip } from '$lib/domain/trip/trip';

export type { RouteCriterion } from '$lib/domain/recommendation/criteria';

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

export interface RouteAlternative {
	criterion: RouteCriterion;
	route: RecommendedRoute;
}

export interface RecommendationResult {
	id: string;
	tripId: string;
	recommended: RecommendedRoute;
	criterion: RouteCriterion | 'latestDeparture';
	mode: RecommendationMode;
	alternatives: RouteAlternative[];
	naiveArrivalAt: string;
	calculatedAt: string;
	liveRoute?: TransitRoute | null;
	scheduleSource?: ScheduleSource;
}

export interface RecommendationInput {
	trip: Trip;
	criterion?: RouteCriterion;
}

export interface RecommendationExplanation {
	summary: string;
	details: string[];
}

export interface ExplanationContext {
	originName: string;
	destinationName: string;
}

import type { TransitRoute } from '$lib/domain/route/route';
import type { ScheduleSource } from '$lib/domain/route/timetable';
import type { Trip } from '$lib/domain/trip/trip';

export const REASON_CODES = {
	LATE_DEPARTURE_WITHOUT_TIME_PENALTY: 'LATE_DEPARTURE_WITHOUT_TIME_PENALTY',
	LOW_WAITING_TIME: 'LOW_WAITING_TIME',
	SHORT_TOTAL_TRAVEL_TIME: 'SHORT_TOTAL_TRAVEL_TIME',
	FEWER_TRANSFERS: 'FEWER_TRANSFERS'
} as const;

export type ReasonCode = (typeof REASON_CODES)[keyof typeof REASON_CODES];

export interface ScoredCandidate {
	departureAt: string;
	expectedArrivalAt: string;
	totalTimeSeconds: number;
	waitingTimeSeconds: number;
	walkingTimeSeconds: number;
	transferCount: number;
	score: number;
	route: TransitRoute;
	reasonCodes: ReasonCode[];
}

export interface RecommendationResult {
	id: string;
	tripId: string;
	recommended: ScoredCandidate;
	alternatives: ScoredCandidate[];
	reasonCodes: ReasonCode[];
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

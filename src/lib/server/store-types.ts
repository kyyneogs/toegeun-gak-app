import type { StandupJobRoute } from '$lib/domain/notify/standup-route';

export interface StoredUser {
	id: string;
	email: string | null;
	authProvider: 'email' | 'google';
	nickname: string;
	rankingOptIn: boolean;
	standupLeadMinutes: number;
	createdAt: string;
}

export interface StoredCommit {
	id: string;
	userId: string;
	recommendationId: string;
	serviceDate: string;
	committedAt: string;
	originName: string;
	destinationName: string;
	departureAt: string;
	arrivalAt: string;
	naiveArrivalAt: string;
	savedSeconds: number;
	criterion: string;
}

export interface StoredPushSubscription {
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
}

export interface StoredStandupJob {
	id: string;
	userId: string;
	fireAt: string;
	title: string;
	body: string;
	sentAt: string | null;
	route: StandupJobRoute | null;
}

export interface RecommendationSnapshotRoute {
	criterion: string;
	departureAt: string;
	arrivalAt: string;
}

export interface RecommendationSnapshotAiCandidate {
	index: number;
	departureAt: string;
	arrivalAt: string;
	totalTimeSeconds: number;
	walkingTimeSeconds: number;
	transferCount: number;
	lineLabel: string;
}

export interface RecommendationSnapshotPayload {
	naiveArrivalAt: string;
	originName: string;
	destinationName: string;
	mode?: 'leaveAfter' | 'arriveBy';
	routes: RecommendationSnapshotRoute[];
	aiCandidates?: RecommendationSnapshotAiCandidate[];
}

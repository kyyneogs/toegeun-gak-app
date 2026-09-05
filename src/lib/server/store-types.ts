export interface StoredUser {
	id: string;
	email: string;
	nickname: string;
	passwordHash: string;
	passwordSalt: string;
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

export interface RecommendationSnapshotRoute {
	criterion: string;
	departureAt: string;
	arrivalAt: string;
}

export interface RecommendationSnapshotPayload {
	naiveArrivalAt: string;
	originName: string;
	destinationName: string;
	routes: RecommendationSnapshotRoute[];
}

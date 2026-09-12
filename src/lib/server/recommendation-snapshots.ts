import { ERROR_CODES } from '$lib/constants/errors';
import { RECOMMENDATION_SNAPSHOT_TTL_MS } from '$lib/constants/persist';
import { AppError } from '$lib/domain/errors';
import {
	candidateAtIndex,
	summariesFromTimedRoutes
} from '$lib/domain/recommendation/ai-candidates';
import type { RecommendationResult } from '$lib/domain/recommendation/types';
import { query, queryOne } from '$lib/server/db';
import type { RecommendationSnapshotPayload } from '$lib/server/store-types';
import { addMinutes, toIso } from '$lib/utils/time';

export function snapshotFromResult(
	result: RecommendationResult,
	originName: string,
	destinationName: string
): RecommendationSnapshotPayload {
	const routes = [
		{
			criterion: result.criterion,
			departureAt: result.recommended.departureAt,
			arrivalAt: result.recommended.expectedArrivalAt
		},
		...result.alternatives.map((item) => ({
			criterion: item.criterion,
			departureAt: item.route.departureAt,
			arrivalAt: item.route.expectedArrivalAt
		}))
	];

	return {
		naiveArrivalAt: result.naiveArrivalAt,
		originName,
		destinationName,
		mode: result.mode,
		routes,
		aiCandidates: summariesFromTimedRoutes(result.timedRoutes)
	};
}

export function withAiPickRoute(
	payload: RecommendationSnapshotPayload,
	index: number
): RecommendationSnapshotPayload {
	const candidate = candidateAtIndex(payload.aiCandidates ?? [], index);

	if (!candidate) {
		throw new AppError(ERROR_CODES.AI_UNAVAILABLE);
	}

	const routes = [
		...payload.routes.filter((route) => route.criterion !== 'aiPick'),
		{
			criterion: 'aiPick',
			departureAt: candidate.departureAt,
			arrivalAt: candidate.arrivalAt
		}
	];

	return { ...payload, routes };
}

export async function saveRecommendationSnapshot(
	id: string,
	payload: RecommendationSnapshotPayload,
	now = new Date()
): Promise<void> {
	const expiresAt = addMinutes(now, RECOMMENDATION_SNAPSHOT_TTL_MS / 60_000);
	await query(
		`INSERT INTO recommendation_snapshots (id, payload, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`,
		[id, JSON.stringify(payload), toIso(expiresAt)]
	);
}

export async function loadRecommendationSnapshot(
	id: string,
	now = new Date()
): Promise<RecommendationSnapshotPayload | null> {
	const row = await queryOne(
		'SELECT payload FROM recommendation_snapshots WHERE id = $1 AND expires_at > $2',
		[id, toIso(now)]
	);

	if (!row) {
		return null;
	}

	const payload = row.payload;
	return (
		typeof payload === 'string' ? JSON.parse(payload) : payload
	) as RecommendationSnapshotPayload;
}

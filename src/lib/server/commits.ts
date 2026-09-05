import { COMMIT_DAILY_LIMIT } from '$lib/constants/persist';
import { ERROR_CODES } from '$lib/constants/errors';
import { savedArrivalSeconds, seoulServiceDate } from '$lib/domain/commit/saved-time';
import { AppError } from '$lib/domain/errors';
import { loadRecommendationSnapshot } from '$lib/server/recommendation-snapshots';
import { isUniqueViolation, query, queryOne } from '$lib/server/db';
import { mapCommit } from '$lib/server/row-map';
import type { StoredCommit } from '$lib/server/store-types';
import { createId } from '$lib/utils/id';
import { toIso } from '$lib/utils/time';

export interface CommitInput {
	userId: string;
	recommendationId: string;
	criterion: string;
}

export async function createCommit(input: CommitInput): Promise<StoredCommit> {
	if (!input.recommendationId) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const snapshot = await loadRecommendationSnapshot(input.recommendationId);

	if (!snapshot) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const chosen =
		snapshot.routes.find((route) => route.criterion === input.criterion) ?? snapshot.routes[0];

	if (!chosen) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const existing = await queryOne(
		'SELECT * FROM commits WHERE user_id = $1 AND recommendation_id = $2',
		[input.userId, input.recommendationId]
	);

	if (existing) {
		return mapCommit(existing);
	}

	const committedAt = new Date();
	const serviceDate = seoulServiceDate(committedAt);
	const todayCount = await queryOne<{ count: string | number }>(
		'SELECT COUNT(*)::int AS count FROM commits WHERE user_id = $1 AND service_date = $2',
		[input.userId, serviceDate]
	);
	const count = Number(todayCount?.count ?? 0);

	if (count >= COMMIT_DAILY_LIMIT) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const commit: StoredCommit = {
		id: createId('commit'),
		userId: input.userId,
		recommendationId: input.recommendationId,
		serviceDate,
		committedAt: toIso(committedAt),
		originName: snapshot.originName,
		destinationName: snapshot.destinationName,
		departureAt: chosen.departureAt,
		arrivalAt: chosen.arrivalAt,
		naiveArrivalAt: snapshot.naiveArrivalAt,
		savedSeconds: savedArrivalSeconds(chosen.arrivalAt, snapshot.naiveArrivalAt),
		criterion: chosen.criterion
	};

	try {
		await query(
			`INSERT INTO commits (
				id, user_id, recommendation_id, service_date, committed_at,
				origin_name, destination_name, departure_at, arrival_at,
				naive_arrival_at, saved_seconds, criterion
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			[
				commit.id,
				commit.userId,
				commit.recommendationId,
				commit.serviceDate,
				commit.committedAt,
				commit.originName,
				commit.destinationName,
				commit.departureAt,
				commit.arrivalAt,
				commit.naiveArrivalAt,
				commit.savedSeconds,
				commit.criterion
			]
		);
	} catch (cause) {
		if (isUniqueViolation(cause)) {
			const duplicate = await queryOne(
				'SELECT * FROM commits WHERE user_id = $1 AND recommendation_id = $2',
				[input.userId, input.recommendationId]
			);
			if (duplicate) {
				return mapCommit(duplicate);
			}
		}

		throw cause;
	}

	return commit;
}

export async function commitsForUser(userId: string): Promise<StoredCommit[]> {
	const rows = await query('SELECT * FROM commits WHERE user_id = $1 ORDER BY committed_at', [
		userId
	]);
	return rows.map(mapCommit);
}

export async function recommendationIdsForUser(userId: string): Promise<string[]> {
	const rows = await query<{ recommendation_id: string }>(
		'SELECT recommendation_id FROM commits WHERE user_id = $1',
		[userId]
	);
	return rows.map((row) => row.recommendation_id);
}

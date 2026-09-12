import type { StandupJobRoute } from '$lib/domain/notify/standup-route';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { query, queryOne } from '$lib/server/db';
import { mapPushSubscription, mapStandupJob } from '$lib/server/row-map';
import type { StoredPushSubscription, StoredStandupJob } from '$lib/server/store-types';
import { createId } from '$lib/utils/id';
import { toIso } from '$lib/utils/time';

export async function savePushSubscription(input: StoredPushSubscription): Promise<void> {
	await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [
		input.userId,
		input.endpoint
	]);
	await query(
		'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)',
		[input.userId, input.endpoint, input.p256dh, input.auth]
	);
}

export async function pushSubscriptionsForUser(userId: string): Promise<StoredPushSubscription[]> {
	const rows = await query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
	return rows.map(mapPushSubscription);
}

export async function scheduleStandupJob(input: {
	userId: string;
	fireAt: Date;
	title: string;
	body: string;
	route?: StandupJobRoute | null;
}): Promise<void> {
	await query(
		`INSERT INTO standup_jobs (id, user_id, fire_at, title, body, sent_at, route)
		VALUES ($1, $2, $3, $4, $5, NULL, $6)`,
		[
			createId('standup'),
			input.userId,
			toIso(input.fireAt),
			input.title,
			input.body,
			input.route ? JSON.stringify(input.route) : null
		]
	);
}

export async function dueStandupJobs(now = new Date()): Promise<
	Array<{
		id: string;
		userId: string;
		title: string;
		body: string;
	}>
> {
	const rows = await query(
		`SELECT id, user_id, title, body FROM standup_jobs
		WHERE sent_at IS NULL AND fire_at <= $1`,
		[toIso(now)]
	);

	return rows.map((row) => ({
		id: String(row.id),
		userId: String(row.user_id),
		title: String(row.title),
		body: String(row.body)
	}));
}

export async function markStandupSent(id: string, now = new Date()): Promise<void> {
	await query('UPDATE standup_jobs SET sent_at = $1 WHERE id = $2', [toIso(now), id]);
}

export async function pendingStandupJobsForUser(userId: string): Promise<StoredStandupJob[]> {
	const rows = await query(
		`SELECT id, user_id, fire_at, title, body, sent_at, route FROM standup_jobs
		WHERE user_id = $1 AND sent_at IS NULL
		ORDER BY fire_at`,
		[userId]
	);
	return rows.map(mapStandupJob);
}

export async function pendingStandupJobForUser(
	userId: string,
	jobId: string
): Promise<StoredStandupJob | null> {
	if (!jobId.trim()) {
		return null;
	}

	const row = await queryOne(
		`SELECT id, user_id, fire_at, title, body, sent_at, route FROM standup_jobs
		WHERE user_id = $1 AND id = $2 AND sent_at IS NULL`,
		[userId, jobId]
	);
	return row ? mapStandupJob(row) : null;
}

export async function cancelStandupJob(userId: string, jobId: string): Promise<void> {
	if (!jobId.trim()) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const deleted = await queryOne(
		`DELETE FROM standup_jobs
		WHERE user_id = $1 AND id = $2 AND sent_at IS NULL
		RETURNING id`,
		[userId, jobId]
	);

	if (!deleted) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}
}

export async function cancelAllPendingStandupJobs(userId: string): Promise<void> {
	await query('DELETE FROM standup_jobs WHERE user_id = $1 AND sent_at IS NULL', [userId]);
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
	await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [
		userId,
		endpoint
	]);
}

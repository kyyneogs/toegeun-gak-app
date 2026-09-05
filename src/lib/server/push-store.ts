import { query } from '$lib/server/db';
import { mapPushSubscription } from '$lib/server/row-map';
import type { StoredPushSubscription } from '$lib/server/store-types';
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
}): Promise<void> {
	await query(
		`INSERT INTO standup_jobs (id, user_id, fire_at, title, body, sent_at)
		VALUES ($1, $2, $3, $4, $5, NULL)`,
		[createId('standup'), input.userId, toIso(input.fireAt), input.title, input.body]
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

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
	await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [
		userId,
		endpoint
	]);
}

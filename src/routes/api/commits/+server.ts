import { json } from '@sveltejs/kit';
import { clockMinutesInSeoul } from '$lib/domain/commit/saved-time';
import { parseStandupJobRoute } from '$lib/domain/notify/standup-route';
import { jsonError } from '$lib/server/json-error';
import { requireUser } from '$lib/server/auth';
import { createCommit } from '$lib/server/commits';
import { scheduleStandupJob } from '$lib/server/push-store';
import { standupLeadMs } from '$lib/constants/persist';
import { fromIso } from '$lib/utils/time';

export async function POST({ request, cookies }) {
	try {
		const user = await requireUser(cookies);
		const body = asRecord(await request.json());
		const commit = await createCommit({
			userId: user.id,
			recommendationId: stringField(body, 'recommendationId'),
			criterion: stringField(body, 'criterion')
		});
		const fireAt = new Date(
			fromIso(commit.departureAt).getTime() - standupLeadMs(user.standupLeadMinutes)
		);

		if (fireAt.getTime() > Date.now()) {
			await scheduleStandupJob({
				userId: user.id,
				fireAt,
				title: '퇴근각',
				body: standupBody(commit.departureAt),
				route: parseStandupJobRoute(body.route)
			});
		}

		return json({ commit });
	} catch (cause) {
		return jsonError(cause);
	}
}

function standupBody(departureAt: string): string {
	const totalMinutes = clockMinutesInSeoul(departureAt);
	const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
	const minutes = String(totalMinutes % 60).padStart(2, '0');
	return `${hours}:${minutes}에 일어나면 돼요`;
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function stringField(record: Record<string, unknown>, key: string): string {
	return typeof record[key] === 'string' ? record[key] : '';
}

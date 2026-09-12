import { json } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { ERROR_CODES, ERROR_USER_MESSAGES } from '$lib/constants/errors';
import { jsonError } from '$lib/server/json-error';
import { requireUser } from '$lib/server/auth';
import {
	cancelAllPendingStandupJobs,
	cancelStandupJob,
	pendingStandupJobsForUser
} from '$lib/server/push-store';

export async function listStandupJobsResponse(cookies: Cookies): Promise<Response> {
	try {
		const user = await requireUser(cookies);
		const jobs = await pendingStandupJobsForUser(user.id);
		return json({
			jobs: jobs.map((job) => ({
				id: job.id,
				fireAt: job.fireAt,
				title: job.title,
				body: job.body,
				route: job.route
			}))
		});
	} catch (cause) {
		return jsonError(cause);
	}
}

export async function cancelStandupJobResponse(
	cookies: Cookies,
	request: Request
): Promise<Response> {
	try {
		const user = await requireUser(cookies);
		let body: unknown;

		try {
			body = await request.json();
		} catch (cause) {
			console.error('Standup cancel JSON parse failed', cause);
			return json(
				{
					code: ERROR_CODES.INVALID_REQUEST,
					message: ERROR_USER_MESSAGES.INVALID_REQUEST
				},
				{ status: 400 }
			);
		}

		const record =
			typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

		if (record.all === true) {
			await cancelAllPendingStandupJobs(user.id);
			return json({ ok: true });
		}

		const id = typeof record.id === 'string' ? record.id : '';
		await cancelStandupJob(user.id, id);
		return json({ ok: true });
	} catch (cause) {
		return jsonError(cause);
	}
}

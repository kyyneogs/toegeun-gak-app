import { json } from '@sveltejs/kit';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { jsonError } from '$lib/server/json-error';
import { requireUser } from '$lib/server/auth';
import { pendingStandupJobForUser } from '$lib/server/push-store';

export async function GET({ cookies, params }) {
	try {
		const user = await requireUser(cookies);
		const job = await pendingStandupJobForUser(user.id, params.id);

		if (!job) {
			throw new AppError(ERROR_CODES.INVALID_REQUEST);
		}

		return json({
			job: {
				id: job.id,
				fireAt: job.fireAt,
				title: job.title,
				body: job.body,
				route: job.route
			}
		});
	} catch (cause) {
		return jsonError(cause);
	}
}

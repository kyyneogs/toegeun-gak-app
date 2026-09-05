import { json } from '@sveltejs/kit';
import { jsonError } from '$lib/server/json-error';
import { requireUser } from '$lib/server/auth';
import { commitsForUser, recommendationIdsForUser } from '$lib/server/commits';
import { summarizeCommits } from '$lib/server/stats';

export async function GET({ cookies }) {
	try {
		const user = await requireUser(cookies);
		const commits = await commitsForUser(user.id);
		return json({
			summary: summarizeCommits(commits),
			recommendationIds: await recommendationIdsForUser(user.id)
		});
	} catch (cause) {
		return jsonError(cause);
	}
}

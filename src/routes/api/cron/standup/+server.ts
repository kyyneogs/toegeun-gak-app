import { json } from '@sveltejs/kit';
import { CRON_MAX_DURATION_SECONDS } from '$lib/constants/persist';
import { dispatchDueStandups } from '$lib/server/push-dispatch';

export const config = {
	maxDuration: CRON_MAX_DURATION_SECONDS
};

export async function GET({ request }) {
	if (!isAuthorizedCron(request)) {
		return json({ ok: false }, { status: 401 });
	}

	await dispatchDueStandups();
	return json({ ok: true });
}

function isAuthorizedCron(request: Request): boolean {
	const secret = process.env.CRON_SECRET?.trim();

	if (!secret) {
		console.error('CRON_SECRET is not configured');
		return false;
	}

	const header = request.headers.get('authorization');
	return header === `Bearer ${secret}`;
}

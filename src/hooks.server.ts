import type { Handle } from '@sveltejs/kit';
import { userFromCookies } from '$lib/server/auth';
import { startPushDispatcher } from '$lib/server/push-dispatch';

const onVercel = Boolean(process.env.VERCEL);

if (process.env.VITEST !== 'true' && process.env.NODE_ENV !== 'test' && !onVercel) {
	startPushDispatcher();
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await userFromCookies(event.cookies);
	return resolve(event);
};

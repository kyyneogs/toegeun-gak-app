import type { Handle } from '@sveltejs/kit';
import { userFromSupabase } from '$lib/server/auth';
import { startPushDispatcher } from '$lib/server/push-dispatch';
import { createSupabaseServerClient } from '$lib/server/supabase';

const onVercel = Boolean(process.env.VERCEL);

if (process.env.VITEST !== 'true' && process.env.NODE_ENV !== 'test' && !onVercel) {
	startPushDispatcher();
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event.cookies);
	event.locals.user = await userFromSupabase(event.locals.supabase);
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-request-id';
		}
	});
};

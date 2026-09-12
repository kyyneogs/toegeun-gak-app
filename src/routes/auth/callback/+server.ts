import { redirect } from '@sveltejs/kit';
import { AUTH_RESET_PATH } from '$lib/domain/auth/credentials';
import { loginPathWithReason, loginPathWithReturn } from '$lib/domain/auth/return-path';
import { ERROR_USER_MESSAGES } from '$lib/constants/errors';
import { ensureAppUser } from '$lib/server/auth';
import { takeAuthReturnPath } from '$lib/server/auth-next-cookie';
import { createSupabaseServerClient } from '$lib/server/supabase';

export async function GET({ url, cookies }) {
	const next = takeAuthReturnPath(cookies, url.searchParams.get('next'));
	const code = url.searchParams.get('code');
	const authError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
	const supabase = createSupabaseServerClient(cookies);

	if (authError || !supabase) {
		throw redirect(303, loginPathWithReturn(next));
	}

	if (!code) {
		throw redirect(303, loginPathWithReturn(next));
	}

	const { data, error } = await supabase.auth.exchangeCodeForSession(code);

	if (error || !data.user) {
		throw redirect(303, loginPathWithReturn(next));
	}

	try {
		await ensureAppUser(data.user);
	} catch (cause) {
		console.error('OAuth profile ensure failed', cause);
		await supabase.auth.signOut();
		throw redirect(303, loginPathWithReason(next, ERROR_USER_MESSAGES.AUTH_INVALID));
	}

	if (next === AUTH_RESET_PATH) {
		throw redirect(303, AUTH_RESET_PATH);
	}

	throw redirect(303, next);
}

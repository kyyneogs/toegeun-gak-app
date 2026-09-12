import { redirect } from '@sveltejs/kit';
import { AUTH_RESET_PATH } from '$lib/domain/auth/credentials';
import {
	loginPathWithReason,
	loginPathWithReturn,
	safeAuthReturnPath
} from '$lib/domain/auth/return-path';
import { ERROR_CODES, ERROR_USER_MESSAGES } from '$lib/constants/errors';
import { ensureAppUser } from '$lib/server/auth';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { AppError } from '$lib/domain/errors';

export async function GET({ url, cookies }) {
	const next = safeAuthReturnPath(url.searchParams.get('next'));
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
		await supabase.auth.signOut();
		const message =
			cause instanceof AppError && cause.code === ERROR_CODES.AUTH_EMAIL_REQUIRED
				? ERROR_USER_MESSAGES.AUTH_EMAIL_REQUIRED
				: ERROR_USER_MESSAGES.AUTH_INVALID;
		throw redirect(303, loginPathWithReason(next, message));
	}

	if (next === AUTH_RESET_PATH) {
		throw redirect(303, AUTH_RESET_PATH);
	}

	throw redirect(303, next);
}

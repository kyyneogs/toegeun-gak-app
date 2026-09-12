import { json } from '@sveltejs/kit';
import { ERROR_CODES } from '$lib/constants/errors';
import {
	authCallbackUrl,
	isValidEmail,
	isValidNickname,
	isValidPassword,
	normalizeEmail
} from '$lib/domain/auth/credentials';
import { AppError } from '$lib/domain/errors';
import { appErrorFromSupabaseAuth, ensureAppUser } from '$lib/server/auth';
import { jsonError } from '$lib/server/json-error';
import { requireSupabase } from '$lib/server/supabase';

export async function POST({ request, cookies, url }) {
	try {
		const supabase = requireSupabase(cookies);
		const record = asRecord(await request.json());
		const email = normalizeEmail(stringField(record, 'email'));
		const password = stringField(record, 'password');
		const nickname = stringField(record, 'nickname').trim();

		if (!isValidEmail(email) || !isValidPassword(password) || !isValidNickname(nickname)) {
			throw new AppError(ERROR_CODES.INVALID_REQUEST);
		}

		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: { nickname },
				emailRedirectTo: authCallbackUrl(url.origin)
			}
		});

		if (error) {
			throw appErrorFromSupabaseAuth(error.message);
		}

		if (data.session && data.user) {
			const user = await ensureAppUser(data.user);
			return json({ user });
		}

		return json({ pendingVerification: true });
	} catch (cause) {
		if (cause instanceof SyntaxError) {
			return jsonError(new AppError(ERROR_CODES.INVALID_REQUEST));
		}

		return jsonError(cause);
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function stringField(record: Record<string, unknown>, key: string): string {
	return typeof record[key] === 'string' ? record[key] : '';
}

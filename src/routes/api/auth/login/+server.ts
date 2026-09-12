import { json } from '@sveltejs/kit';
import { ERROR_CODES } from '$lib/constants/errors';
import { isValidEmail, isValidPassword, normalizeEmail } from '$lib/domain/auth/credentials';
import { AppError } from '$lib/domain/errors';
import { appErrorFromSupabaseAuth, ensureAppUser } from '$lib/server/auth';
import { jsonError } from '$lib/server/json-error';
import { requireSupabase } from '$lib/server/supabase';

export async function POST({ request, cookies }) {
	try {
		const supabase = requireSupabase(cookies);
		const record = asRecord(await request.json());
		const email = normalizeEmail(stringField(record, 'email'));
		const password = stringField(record, 'password');

		if (!isValidEmail(email) || !isValidPassword(password)) {
			throw new AppError(ERROR_CODES.AUTH_INVALID);
		}

		const { data, error } = await supabase.auth.signInWithPassword({ email, password });

		if (error) {
			throw appErrorFromSupabaseAuth(error.message);
		}

		if (!data.user) {
			throw new AppError(ERROR_CODES.AUTH_INVALID);
		}

		if (!data.user.email_confirmed_at) {
			throw new AppError(ERROR_CODES.AUTH_UNVERIFIED);
		}

		const user = await ensureAppUser(data.user);
		return json({ user });
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

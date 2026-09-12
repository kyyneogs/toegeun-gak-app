import { json } from '@sveltejs/kit';
import { ERROR_CODES } from '$lib/constants/errors';
import { isValidPassword } from '$lib/domain/auth/credentials';
import { AppError } from '$lib/domain/errors';
import { jsonError } from '$lib/server/json-error';
import { requireSupabase } from '$lib/server/supabase';

export async function POST({ request, cookies }) {
	try {
		const supabase = requireSupabase(cookies);
		const record = asRecord(await request.json());
		const password = typeof record.password === 'string' ? record.password : '';

		if (!isValidPassword(password)) {
			throw new AppError(ERROR_CODES.INVALID_REQUEST);
		}

		const { data: sessionData } = await supabase.auth.getUser();

		if (!sessionData.user) {
			throw new AppError(ERROR_CODES.AUTH_REQUIRED);
		}

		const { error } = await supabase.auth.updateUser({ password });

		if (error) {
			throw new AppError(ERROR_CODES.AUTH_INVALID);
		}

		return json({ ok: true });
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

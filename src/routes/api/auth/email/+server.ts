import { json } from '@sveltejs/kit';
import { ERROR_CODES } from '$lib/constants/errors';
import {
	AUTH_RESET_PATH,
	authCallbackUrl,
	isValidEmail,
	normalizeEmail
} from '$lib/domain/auth/credentials';
import { AppError } from '$lib/domain/errors';
import { rememberAuthReturnPath } from '$lib/server/auth-next-cookie';
import { jsonError } from '$lib/server/json-error';
import { requireSupabase } from '$lib/server/supabase';

export async function POST({ request, cookies, url }) {
	try {
		const supabase = requireSupabase(cookies);
		const record = asRecord(await request.json());
		const email = normalizeEmail(stringField(record, 'email'));

		if (!isValidEmail(email)) {
			throw new AppError(ERROR_CODES.INVALID_REQUEST);
		}

		const type = record.type === 'signup' ? 'signup' : 'recovery';
		const redirectTo = authCallbackUrl(url.origin);

		if (type === 'signup') {
			const { error } = await supabase.auth.resend({
				type: 'signup',
				email,
				options: { emailRedirectTo: redirectTo }
			});

			if (error) {
				throw new AppError(ERROR_CODES.AUTH_UNAVAILABLE);
			}

			return json({ ok: true });
		}

		rememberAuthReturnPath(cookies, AUTH_RESET_PATH, url.protocol === 'https:');
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo
		});

		if (error) {
			throw new AppError(ERROR_CODES.AUTH_UNAVAILABLE);
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

function stringField(record: Record<string, unknown>, key: string): string {
	return typeof record[key] === 'string' ? record[key] : '';
}

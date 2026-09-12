import { json } from '@sveltejs/kit';
import { ERROR_CODES } from '$lib/constants/errors';
import { authCallbackUrl, isAuthOAuthProvider } from '$lib/domain/auth/credentials';
import { safeAuthReturnPath } from '$lib/domain/auth/return-path';
import { AppError } from '$lib/domain/errors';
import { rememberAuthReturnPath } from '$lib/server/auth-next-cookie';
import { jsonError } from '$lib/server/json-error';
import { requireSupabase } from '$lib/server/supabase';

export async function POST({ request, cookies, url }) {
	try {
		const supabase = requireSupabase(cookies);
		const record = asRecord(await request.json());
		const provider = record.provider;

		if (!isAuthOAuthProvider(provider)) {
			throw new AppError(ERROR_CODES.INVALID_REQUEST);
		}

		const next = safeAuthReturnPath(typeof record.next === 'string' ? record.next : '/');
		rememberAuthReturnPath(cookies, next, url.protocol === 'https:');
		const redirectTo = authCallbackUrl(url.origin);
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo,
				skipBrowserRedirect: true
			}
		});

		if (error || !data.url) {
			throw new AppError(ERROR_CODES.AUTH_UNAVAILABLE);
		}

		return json({ url: data.url });
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

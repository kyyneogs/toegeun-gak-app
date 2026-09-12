import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';

export function supabasePublicConfig(): { url: string; anonKey: string } | null {
	const url = env.PUBLIC_SUPABASE_URL?.trim() || process.env.PUBLIC_SUPABASE_URL?.trim();
	const anonKey =
		env.PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.PUBLIC_SUPABASE_ANON_KEY?.trim();

	if (!url || !anonKey) {
		return null;
	}

	return { url, anonKey };
}

export function requireSupabase(cookies: Cookies): SupabaseClient {
	const client = createSupabaseServerClient(cookies);

	if (!client) {
		throw new AppError(ERROR_CODES.AUTH_UNAVAILABLE);
	}

	return client;
}

export function createSupabaseServerClient(cookies: Cookies): SupabaseClient | null {
	const config = supabasePublicConfig();

	if (!config) {
		return null;
	}

	return createServerClient(config.url, config.anonKey, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookiesToSet) => {
				for (const { name, value, options } of cookiesToSet) {
					cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});
}

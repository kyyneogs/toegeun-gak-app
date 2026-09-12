import type { Cookies } from '@sveltejs/kit';
import { AUTH_NEXT_COOKIE, AUTH_NEXT_COOKIE_MAX_AGE_SECONDS } from '$lib/domain/auth/credentials';
import { safeAuthReturnPath, type AuthReturnPath } from '$lib/domain/auth/return-path';

export function rememberAuthReturnPath(
	cookies: Cookies,
	next: AuthReturnPath,
	secure: boolean
): void {
	cookies.set(AUTH_NEXT_COOKIE, next, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: AUTH_NEXT_COOKIE_MAX_AGE_SECONDS,
		secure
	});
}

export function takeAuthReturnPath(cookies: Cookies, queryNext?: string | null): AuthReturnPath {
	const fromQuery = queryNext ? safeAuthReturnPath(queryNext) : null;
	const fromCookie = safeAuthReturnPath(cookies.get(AUTH_NEXT_COOKIE));
	cookies.delete(AUTH_NEXT_COOKIE, { path: '/' });
	return fromQuery ?? fromCookie;
}

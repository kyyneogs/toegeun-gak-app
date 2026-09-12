import { AUTH_NEXT_COOKIE } from '$lib/domain/auth/credentials';
import { rememberAuthReturnPath, takeAuthReturnPath } from '$lib/server/auth-next-cookie';
import { describe, expect, it } from 'vitest';

function memoryCookies(initial: Record<string, string> = {}) {
	const store = { ...initial };
	return {
		get: (name: string) => store[name],
		set: (name: string, value: string) => {
			store[name] = value;
		},
		delete: (name: string) => {
			delete store[name];
		},
		store
	};
}

describe('auth next cookie', () => {
	it('remembers the return path without putting it on the callback URL', () => {
		const cookies = memoryCookies();
		rememberAuthReturnPath(cookies as never, '/settings', false);
		expect(cookies.store[AUTH_NEXT_COOKIE]).toBe('/settings');
		expect(takeAuthReturnPath(cookies as never, null)).toBe('/settings');
		expect(cookies.store[AUTH_NEXT_COOKIE]).toBeUndefined();
	});

	it('prefers a query next when the old callback link still has one', () => {
		const cookies = memoryCookies({ [AUTH_NEXT_COOKIE]: '/settings' });
		expect(takeAuthReturnPath(cookies as never, '/result')).toBe('/result');
	});
});

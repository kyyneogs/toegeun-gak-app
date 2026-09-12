import { AUTH_RESET_PATH } from '$lib/domain/auth/credentials';

export const AUTH_RETURN_PATHS = [
	'/',
	'/result',
	'/settings',
	'/record',
	'/ranking',
	AUTH_RESET_PATH
] as const;

export type AuthReturnPath = (typeof AUTH_RETURN_PATHS)[number];

export function safeAuthReturnPath(raw: string | null | undefined): AuthReturnPath {
	if (!raw) {
		return '/';
	}

	const path = raw.split('?')[0]?.split('#')[0] ?? '/';

	if ((AUTH_RETURN_PATHS as readonly string[]).includes(path)) {
		return path as AuthReturnPath;
	}

	return '/';
}

export function loginPathWithReturn(next: AuthReturnPath): string {
	if (next === '/') {
		return '/login';
	}

	return `/login?next=${encodeURIComponent(next)}`;
}

export function loginPathWithReason(next: AuthReturnPath, reason: string): string {
	const base = loginPathWithReturn(next);
	const separator = base.includes('?') ? '&' : '?';
	return `${base}${separator}reason=${encodeURIComponent(reason)}`;
}

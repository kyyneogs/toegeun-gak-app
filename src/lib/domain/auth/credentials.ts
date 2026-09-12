export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_NICKNAME_MAX_LENGTH = 12;
export const AUTH_CALLBACK_PATH = '/auth/callback';
export const AUTH_RESET_PATH = '/auth/reset';
export const AUTH_NEXT_COOKIE = 'tgk_auth_next';
export const AUTH_NEXT_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export function authCallbackUrl(origin: string): string {
	return `${origin.replace(/\/$/, '')}${AUTH_CALLBACK_PATH}`;
}

export const AUTH_OAUTH_PROVIDERS = ['google'] as const;

export type AuthOAuthProvider = (typeof AUTH_OAUTH_PROVIDERS)[number];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
	return EMAIL_PATTERN.test(normalizeEmail(email));
}

export function isValidPassword(password: string): boolean {
	return password.length >= AUTH_PASSWORD_MIN_LENGTH;
}

export function isValidNickname(nickname: string): boolean {
	const trimmed = nickname.trim();
	return trimmed.length > 0 && trimmed.length <= AUTH_NICKNAME_MAX_LENGTH;
}

export function isAuthOAuthProvider(value: unknown): value is AuthOAuthProvider {
	return typeof value === 'string' && (AUTH_OAUTH_PROVIDERS as readonly string[]).includes(value);
}

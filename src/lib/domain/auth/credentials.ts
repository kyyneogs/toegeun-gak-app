export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_NICKNAME_MAX_LENGTH = 12;
export const SESSION_COOKIE_NAME = 'tgk_session';
export const SESSION_DAYS = 30;

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

import {
	AUTH_NICKNAME_MAX_LENGTH,
	AUTH_PASSWORD_MIN_LENGTH,
	isValidEmail,
	isValidNickname,
	isValidPassword,
	isAuthOAuthProvider,
	normalizeEmail
} from '$lib/domain/auth/credentials';
import { describe, expect, it } from 'vitest';

describe('auth credentials', () => {
	it('normalizes email and checks shape', () => {
		expect(normalizeEmail('  A@B.com ')).toBe('a@b.com');
		expect(isValidEmail('a@b.com')).toBe(true);
		expect(isValidEmail('nope')).toBe(false);
	});

	it('requires a password of 8+ characters and a short nickname', () => {
		expect(isValidPassword('1234567')).toBe(false);
		expect(isValidPassword('12345678')).toBe(true);
		expect(AUTH_PASSWORD_MIN_LENGTH).toBe(8);
		expect(isValidNickname('퇴근러')).toBe(true);
		expect(isValidNickname('x'.repeat(AUTH_NICKNAME_MAX_LENGTH + 1))).toBe(false);
		expect(isAuthOAuthProvider('kakao')).toBe(true);
		expect(isAuthOAuthProvider('naver')).toBe(false);
	});
});

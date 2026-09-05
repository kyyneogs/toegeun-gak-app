import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Cookies } from '@sveltejs/kit';
import type { SessionUser } from '$lib/domain/auth/user';
import { ERROR_CODES } from '$lib/constants/errors';
import { clampStandupLeadMinutes, DEFAULT_STANDUP_LEAD_MINUTES } from '$lib/constants/persist';
import {
	SESSION_COOKIE_NAME,
	SESSION_DAYS,
	isValidEmail,
	isValidNickname,
	isValidPassword,
	normalizeEmail
} from '$lib/domain/auth/credentials';
import { AppError } from '$lib/domain/errors';
import { isUniqueViolation, query, queryOne } from '$lib/server/db';
import { mapUser } from '$lib/server/row-map';
import type { StoredUser } from '$lib/server/store-types';
import { createId } from '$lib/utils/id';
import { addMinutes, toIso } from '$lib/utils/time';

const scrypt = promisify(scryptCallback);
const HASH_LENGTH = 64;
const SALT_LENGTH = 16;
const TOKEN_LENGTH = 32;

export type PublicUser = SessionUser;

export function toPublicUser(user: StoredUser): PublicUser {
	return {
		id: user.id,
		email: user.email,
		nickname: user.nickname,
		rankingOptIn: user.rankingOptIn,
		standupLeadMinutes: user.standupLeadMinutes
	};
}

export async function registerUser(input: {
	email: string;
	password: string;
	nickname: string;
}): Promise<StoredUser> {
	if (
		!isValidEmail(input.email) ||
		!isValidPassword(input.password) ||
		!isValidNickname(input.nickname)
	) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const email = normalizeEmail(input.email);
	const passwordSalt = randomBytes(SALT_LENGTH).toString('hex');
	const passwordHash = await hashPassword(input.password, passwordSalt);
	const user: StoredUser = {
		id: createId('user'),
		email,
		nickname: input.nickname.trim(),
		passwordHash,
		passwordSalt,
		rankingOptIn: false,
		standupLeadMinutes: DEFAULT_STANDUP_LEAD_MINUTES,
		createdAt: toIso(new Date())
	};

	try {
		await query(
			`INSERT INTO users (
				id, email, nickname, password_hash, password_salt, ranking_opt_in, standup_lead_minutes, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				user.id,
				user.email,
				user.nickname,
				user.passwordHash,
				user.passwordSalt,
				user.rankingOptIn,
				user.standupLeadMinutes,
				user.createdAt
			]
		);
	} catch (cause) {
		if (isUniqueViolation(cause)) {
			throw new AppError(ERROR_CODES.AUTH_CONFLICT);
		}

		throw cause;
	}

	return user;
}

export async function authenticateUser(email: string, password: string): Promise<StoredUser> {
	if (!isValidEmail(email) || !isValidPassword(password)) {
		throw new AppError(ERROR_CODES.AUTH_INVALID);
	}

	const row = await queryOne('SELECT * FROM users WHERE email = $1', [normalizeEmail(email)]);

	if (!row) {
		throw new AppError(ERROR_CODES.AUTH_INVALID);
	}

	const user = mapUser(row);
	const hash = await hashPassword(password, user.passwordSalt);

	if (!safeEqualHex(hash, user.passwordHash)) {
		throw new AppError(ERROR_CODES.AUTH_INVALID);
	}

	return user;
}

export async function createSession(userId: string, cookies: Cookies): Promise<void> {
	const token = randomBytes(TOKEN_LENGTH).toString('hex');
	const expiresAt = addMinutes(new Date(), SESSION_DAYS * 24 * 60);

	await query('DELETE FROM sessions WHERE user_id = $1 OR expires_at <= $2', [
		userId,
		toIso(new Date())
	]);
	await query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [
		token,
		userId,
		toIso(expiresAt)
	]);

	cookies.set(SESSION_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt
	});
}

export async function destroySession(cookies: Cookies): Promise<void> {
	const token = cookies.get(SESSION_COOKIE_NAME);

	if (token) {
		await query('DELETE FROM sessions WHERE token = $1', [token]);
	}

	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export async function userFromCookies(cookies: Cookies): Promise<PublicUser | null> {
	const token = cookies.get(SESSION_COOKIE_NAME);

	if (!token) {
		return null;
	}

	const row = await queryOne(
		`SELECT users.* FROM users
		INNER JOIN sessions ON sessions.user_id = users.id
		WHERE sessions.token = $1 AND sessions.expires_at > $2`,
		[token, toIso(new Date())]
	);

	return row ? toPublicUser(mapUser(row)) : null;
}

export async function requireUser(cookies: Cookies): Promise<PublicUser> {
	const user = await userFromCookies(cookies);

	if (!user) {
		throw new AppError(ERROR_CODES.AUTH_REQUIRED);
	}

	return user;
}

export async function updateUserProfile(
	userId: string,
	patch: { nickname?: string; rankingOptIn?: boolean; standupLeadMinutes?: number }
): Promise<PublicUser> {
	if (patch.nickname !== undefined && !isValidNickname(patch.nickname)) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const row = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);

	if (!row) {
		throw new AppError(ERROR_CODES.AUTH_REQUIRED);
	}

	const user = mapUser(row);
	const nickname = patch.nickname !== undefined ? patch.nickname.trim() : user.nickname;
	const rankingOptIn = patch.rankingOptIn ?? user.rankingOptIn;
	const standupLeadMinutes =
		patch.standupLeadMinutes !== undefined
			? clampStandupLeadMinutes(patch.standupLeadMinutes)
			: user.standupLeadMinutes;

	await query(
		'UPDATE users SET nickname = $1, ranking_opt_in = $2, standup_lead_minutes = $3 WHERE id = $4',
		[nickname, rankingOptIn, standupLeadMinutes, userId]
	);

	return {
		id: user.id,
		email: user.email,
		nickname,
		rankingOptIn,
		standupLeadMinutes
	};
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
	const derived = (await scrypt(password, Buffer.from(saltHex, 'hex'), HASH_LENGTH)) as Buffer;
	return derived.toString('hex');
}

function safeEqualHex(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left, 'hex');
	const rightBuffer = Buffer.from(right, 'hex');

	if (leftBuffer.length !== rightBuffer.length) {
		return false;
	}

	return timingSafeEqual(leftBuffer, rightBuffer);
}

import type { Cookies } from '@sveltejs/kit';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ERROR_CODES } from '$lib/constants/errors';
import { clampStandupLeadMinutes, DEFAULT_STANDUP_LEAD_MINUTES } from '$lib/constants/persist';
import type { SessionUser } from '$lib/domain/auth/user';
import { isValidEmail, isValidNickname, normalizeEmail } from '$lib/domain/auth/credentials';
import { nicknameFromAuthMetadata } from '$lib/domain/auth/nickname';
import { authProviderFromIdentities } from '$lib/domain/auth/provider';
import { AppError } from '$lib/domain/errors';
import { isUniqueViolation, query, queryOne } from '$lib/server/db';
import { mapUser } from '$lib/server/row-map';
import type { StoredUser } from '$lib/server/store-types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { toIso } from '$lib/utils/time';

export type PublicUser = SessionUser;

export function toPublicUser(user: StoredUser): PublicUser {
	return {
		id: user.id,
		email: user.email,
		authProvider: user.authProvider,
		nickname: user.nickname,
		rankingOptIn: user.rankingOptIn,
		standupLeadMinutes: user.standupLeadMinutes
	};
}

export async function insertTestUser(input: {
	email: string;
	nickname: string;
	id?: string;
}): Promise<StoredUser> {
	if (!isValidEmail(input.email) || !isValidNickname(input.nickname)) {
		throw new AppError(ERROR_CODES.INVALID_REQUEST);
	}

	const user: StoredUser = {
		id: input.id ?? crypto.randomUUID(),
		email: normalizeEmail(input.email),
		authProvider: 'email',
		nickname: input.nickname.trim(),
		rankingOptIn: false,
		standupLeadMinutes: DEFAULT_STANDUP_LEAD_MINUTES,
		createdAt: toIso(new Date())
	};

	try {
		await query(
			`INSERT INTO users (
				id, email, auth_provider, nickname, ranking_opt_in, standup_lead_minutes, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[
				user.id,
				user.email,
				user.authProvider,
				user.nickname,
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

export async function ensureAppUser(authUser: User): Promise<PublicUser> {
	const email = emailFromAuthUser(authUser.email);
	const authProvider = authProviderFromIdentities(authUser.identities);
	const existing = await queryOne('SELECT * FROM users WHERE id = $1', [authUser.id]);
	const nickname = nicknameFromAuthMetadata(
		email ?? undefined,
		asStringRecord(authUser.user_metadata)
	);

	if (!existing) {
		const created: StoredUser = {
			id: authUser.id,
			email,
			authProvider,
			nickname,
			rankingOptIn: false,
			standupLeadMinutes: DEFAULT_STANDUP_LEAD_MINUTES,
			createdAt: toIso(new Date())
		};

		try {
			await query(
				`INSERT INTO users (
					id, email, auth_provider, nickname, ranking_opt_in, standup_lead_minutes, created_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[
					created.id,
					created.email,
					created.authProvider,
					created.nickname,
					created.rankingOptIn,
					created.standupLeadMinutes,
					created.createdAt
				]
			);
		} catch (cause) {
			if (!isUniqueViolation(cause)) {
				throw cause;
			}

			const raced = await queryOne('SELECT * FROM users WHERE id = $1', [authUser.id]);

			if (!raced) {
				throw new AppError(ERROR_CODES.AUTH_REQUIRED);
			}

			return toPublicUser(mapUser(raced));
		}

		return toPublicUser(created);
	}

	const stored = mapUser(existing);
	const nextEmail = email ?? stored.email;
	const nextProvider = authProvider !== 'email' ? authProvider : stored.authProvider;

	if (stored.email !== nextEmail || stored.authProvider !== nextProvider) {
		await query('UPDATE users SET email = $1, auth_provider = $2 WHERE id = $3', [
			nextEmail,
			nextProvider,
			stored.id
		]);
		return toPublicUser({ ...stored, email: nextEmail, authProvider: nextProvider });
	}

	return toPublicUser(stored);
}

export async function userFromCookies(cookies: Cookies): Promise<PublicUser | null> {
	return userFromSupabase(createSupabaseServerClient(cookies));
}

export async function userFromSupabase(
	supabase: SupabaseClient | null
): Promise<PublicUser | null> {
	if (!supabase) {
		return null;
	}

	const { data, error } = await supabase.auth.getUser();

	if (error || !data.user) {
		return null;
	}

	if (!data.user.email_confirmed_at && !hasOAuthIdentity(data.user)) {
		return null;
	}

	try {
		return await ensureAppUser(data.user);
	} catch (cause) {
		console.error('ensureAppUser failed', cause);
		return null;
	}
}

export async function requireUser(cookies: Cookies): Promise<PublicUser> {
	const user = await userFromCookies(cookies);

	if (!user) {
		throw new AppError(ERROR_CODES.AUTH_REQUIRED);
	}

	return user;
}

export async function destroySession(cookies: Cookies): Promise<void> {
	const supabase = createSupabaseServerClient(cookies);

	if (!supabase) {
		return;
	}

	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error('Supabase signOut failed', error);
	}
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
		authProvider: user.authProvider,
		nickname,
		rankingOptIn,
		standupLeadMinutes
	};
}

export function appErrorFromSupabaseAuth(message: string): AppError {
	const lower = message.toLowerCase();

	if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
		return new AppError(ERROR_CODES.AUTH_UNVERIFIED);
	}

	if (lower.includes('already registered') || lower.includes('already been registered')) {
		return new AppError(ERROR_CODES.AUTH_CONFLICT);
	}

	if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
		return new AppError(ERROR_CODES.AUTH_INVALID);
	}

	return new AppError(ERROR_CODES.AUTH_INVALID);
}

function emailFromAuthUser(email: string | undefined): string | null {
	if (!email) {
		return null;
	}

	const normalized = normalizeEmail(email);
	return isValidEmail(normalized) ? normalized : null;
}

function hasOAuthIdentity(user: User): boolean {
	return (user.identities ?? []).some((identity) => identity.provider !== 'email');
}

function asStringRecord(value: unknown): Record<string, unknown> | undefined {
	if (typeof value === 'object' && value !== null) {
		return value as Record<string, unknown>;
	}

	return undefined;
}

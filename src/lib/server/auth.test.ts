import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import {
	appErrorFromSupabaseAuth,
	ensureAppUser,
	insertTestUser,
	toPublicUser,
	updateUserProfile
} from '$lib/server/auth';
import { createCommit } from '$lib/server/commits';
import { resetDatabaseForTests } from '$lib/server/db';
import {
	loadRecommendationSnapshot,
	saveRecommendationSnapshot
} from '$lib/server/recommendation-snapshots';
import { summarizeCommits, weeklyRanking } from '$lib/server/stats';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(async () => {
	await resetDatabaseForTests();
});

describe('auth and commits', () => {
	it('inserts a user and rejects a duplicate email', async () => {
		const user = await insertTestUser({
			email: 'a@b.com',
			nickname: '퇴근러'
		});
		expect(toPublicUser(user).email).toBe('a@b.com');

		try {
			await insertTestUser({
				email: 'A@b.com',
				nickname: '다른사람'
			});
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.AUTH_CONFLICT);
		}
	});

	it('maps supabase auth errors', () => {
		expect(appErrorFromSupabaseAuth('Email not confirmed').code).toBe(ERROR_CODES.AUTH_UNVERIFIED);
		expect(appErrorFromSupabaseAuth('User already registered').code).toBe(
			ERROR_CODES.AUTH_CONFLICT
		);
		expect(appErrorFromSupabaseAuth('Invalid login credentials').code).toBe(
			ERROR_CODES.AUTH_INVALID
		);
	});

	it('upserts a profile from an auth user', async () => {
		const authUser = {
			id: '11111111-1111-4111-8111-111111111111',
			email: 'oauth@b.com',
			user_metadata: { nickname: '오쓰러' }
		};
		const created = await ensureAppUser(authUser as never);
		expect(created.nickname).toBe('오쓰러');
		expect(created.authProvider).toBe('email');
		const again = await ensureAppUser({ ...authUser, email: 'oauth+alias@b.com' } as never);
		expect(again.email).toBe('oauth+alias@b.com');
		expect(again.id).toBe(created.id);
	});

	it('allows oauth users without an email', async () => {
		const created = await ensureAppUser({
			id: '22222222-2222-4222-8222-222222222222',
			identities: [{ provider: 'google' }],
			user_metadata: { nickname: '각러' }
		} as never);
		expect(created.email).toBeNull();
		expect(created.authProvider).toBe('google');
		expect(created.nickname).toBe('각러');
	});

	it('stores a commit from the server snapshot, not client times', async () => {
		const user = await insertTestUser({
			email: 'a@b.com',
			nickname: '퇴근러'
		});
		await saveRecommendationSnapshot('rec_1', {
			naiveArrivalAt: '2026-08-29T10:20:00.000Z',
			originName: '회사',
			destinationName: '집',
			routes: [
				{
					criterion: 'earliestArrival',
					departureAt: '2026-08-29T09:18:00.000Z',
					arrivalAt: '2026-08-29T10:00:00.000Z'
				}
			]
		});
		const commit = await createCommit({
			userId: user.id,
			recommendationId: 'rec_1',
			criterion: 'earliestArrival'
		});
		const summary = summarizeCommits([commit]);
		expect(commit.savedSeconds).toBe(20 * 60);
		expect(summary.lifetimeSeconds).toBe(20 * 60);
	});

	it('rejects a commit when the recommendation snapshot is missing', async () => {
		const user = await insertTestUser({
			email: 'a@b.com',
			nickname: '퇴근러'
		});

		try {
			await createCommit({
				userId: user.id,
				recommendationId: 'rec_forged',
				criterion: 'earliestArrival'
			});
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.INVALID_REQUEST);
		}
	});

	it('ignores expired recommendation snapshots', async () => {
		await saveRecommendationSnapshot(
			'rec_old',
			{
				naiveArrivalAt: '2026-08-29T10:20:00.000Z',
				originName: '회사',
				destinationName: '집',
				routes: [
					{
						criterion: 'earliestArrival',
						departureAt: '2026-08-29T09:18:00.000Z',
						arrivalAt: '2026-08-29T10:00:00.000Z'
					}
				]
			},
			new Date('2020-01-01T00:00:00.000Z')
		);

		expect(await loadRecommendationSnapshot('rec_old', new Date('2026-08-29T00:00:00.000Z'))).toBe(
			null
		);
	});

	it('ranks only opt-in nicknames and never returns user ids', async () => {
		const visible = await insertTestUser({
			email: 'open@b.com',
			nickname: '공개러'
		});
		const hidden = await insertTestUser({
			email: 'hidden@b.com',
			nickname: '비공개'
		});
		await updateUserProfile(visible.id, { rankingOptIn: true });
		await saveRecommendationSnapshot('rec_open', {
			naiveArrivalAt: '2026-08-29T10:20:00.000Z',
			originName: '회사',
			destinationName: '집',
			routes: [
				{
					criterion: 'earliestArrival',
					departureAt: '2026-08-29T09:30:00.000Z',
					arrivalAt: '2026-08-29T10:00:00.000Z'
				}
			]
		});
		await saveRecommendationSnapshot('rec_hidden', {
			naiveArrivalAt: '2026-08-29T10:20:00.000Z',
			originName: '회사',
			destinationName: '집',
			routes: [
				{
					criterion: 'earliestArrival',
					departureAt: '2026-08-29T09:00:00.000Z',
					arrivalAt: '2026-08-29T10:00:00.000Z'
				}
			]
		});
		await createCommit({
			userId: visible.id,
			recommendationId: 'rec_open',
			criterion: 'earliestArrival'
		});
		await createCommit({
			userId: hidden.id,
			recommendationId: 'rec_hidden',
			criterion: 'earliestArrival'
		});

		const ranking = await weeklyRanking();
		expect(ranking.saved.map((entry) => entry.nickname)).toEqual(['공개러']);
		expect(ranking.saved[0]?.savedLabel).toBe('20분');
		expect(ranking).not.toHaveProperty('latestLeave');
		expect(JSON.stringify(ranking)).not.toContain(visible.id);
		expect(JSON.stringify(ranking)).not.toContain(hidden.id);
		expect(ranking.saved[0]).not.toHaveProperty('userId');
	});
});

import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { authenticateUser, registerUser, toPublicUser, updateUserProfile } from '$lib/server/auth';
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
	it('registers a user and rejects a duplicate email', async () => {
		const user = await registerUser({
			email: 'a@b.com',
			password: 'password1',
			nickname: '퇴근러'
		});
		expect(toPublicUser(user).email).toBe('a@b.com');

		try {
			await registerUser({
				email: 'A@b.com',
				password: 'password1',
				nickname: '다른사람'
			});
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.AUTH_CONFLICT);
		}
	});

	it('authenticates with the same password', async () => {
		await registerUser({
			email: 'a@b.com',
			password: 'password1',
			nickname: '퇴근러'
		});
		const user = await authenticateUser('a@b.com', 'password1');
		expect(user.nickname).toBe('퇴근러');
	});

	it('stores a commit from the server snapshot, not client times', async () => {
		const user = await registerUser({
			email: 'a@b.com',
			password: 'password1',
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
		const user = await registerUser({
			email: 'a@b.com',
			password: 'password1',
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
		const visible = await registerUser({
			email: 'open@b.com',
			password: 'password1',
			nickname: '공개러'
		});
		const hidden = await registerUser({
			email: 'hidden@b.com',
			password: 'password1',
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

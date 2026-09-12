import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { insertTestUser } from '$lib/server/auth';
import { resetDatabaseForTests } from '$lib/server/db';
import {
	cancelAllPendingStandupJobs,
	cancelStandupJob,
	markStandupSent,
	pendingStandupJobsForUser,
	scheduleStandupJob
} from '$lib/server/push-store';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(async () => {
	await resetDatabaseForTests();
});

describe('standup jobs', () => {
	it('lists only pending jobs for that user', async () => {
		const owner = await insertTestUser({ email: 'a@b.com', nickname: '퇴근러' });
		const other = await insertTestUser({ email: 'c@d.com', nickname: '다른사람' });
		const later = new Date('2026-09-12T12:00:00.000Z');
		const sooner = new Date('2026-09-12T11:00:00.000Z');

		await scheduleStandupJob({
			userId: owner.id,
			fireAt: later,
			title: '퇴근각',
			body: '나중'
		});
		await scheduleStandupJob({
			userId: owner.id,
			fireAt: sooner,
			title: '퇴근각',
			body: '먼저'
		});
		await scheduleStandupJob({
			userId: other.id,
			fireAt: sooner,
			title: '퇴근각',
			body: '다른사람'
		});

		const pending = await pendingStandupJobsForUser(owner.id);
		expect(pending.map((job) => job.body)).toEqual(['먼저', '나중']);
	});

	it('stores a route summary with the job', async () => {
		const owner = await insertTestUser({ email: 'a@b.com', nickname: '퇴근러' });
		await scheduleStandupJob({
			userId: owner.id,
			fireAt: new Date('2026-09-12T12:00:00.000Z'),
			title: '퇴근각',
			body: '먼저',
			route: {
				originName: '회사',
				destinationName: '집',
				departureAt: '2026-09-12T09:19:00.000Z',
				arrivalAt: '2026-09-12T10:00:00.000Z',
				lineLabel: '8호선',
				totalTimeSeconds: 2460,
				sections: [
					{
						sequence: 1,
						type: 'subway',
						startPlaceName: '모란역',
						endPlaceName: '강남역',
						departureAt: '2026-09-12T09:25:00.000Z',
						arrivalAt: '2026-09-12T10:00:00.000Z',
						waitingTimeSeconds: 0,
						routeName: '8호선'
					}
				]
			}
		});

		const [job] = await pendingStandupJobsForUser(owner.id);
		expect(job?.route?.originName).toBe('회사');
		expect(job?.route?.lineLabel).toBe('8호선');
		expect(job?.route?.sections).toHaveLength(1);
	});

	it('cancels only the owner pending job', async () => {
		const owner = await insertTestUser({ email: 'a@b.com', nickname: '퇴근러' });
		const other = await insertTestUser({ email: 'c@d.com', nickname: '다른사람' });
		const fireAt = new Date('2026-09-12T12:00:00.000Z');

		await scheduleStandupJob({
			userId: owner.id,
			fireAt,
			title: '퇴근각',
			body: '내 알림'
		});
		await scheduleStandupJob({
			userId: other.id,
			fireAt,
			title: '퇴근각',
			body: '다른 알림'
		});

		const [mine] = await pendingStandupJobsForUser(owner.id);
		const [theirs] = await pendingStandupJobsForUser(other.id);
		expect(mine).toBeDefined();
		expect(theirs).toBeDefined();

		try {
			await cancelStandupJob(owner.id, theirs?.id ?? '');
			expect.fail('should throw');
		} catch (error) {
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).code).toBe(ERROR_CODES.INVALID_REQUEST);
		}

		await cancelStandupJob(owner.id, mine?.id ?? '');
		expect(await pendingStandupJobsForUser(owner.id)).toEqual([]);
		expect((await pendingStandupJobsForUser(other.id)).map((job) => job.body)).toEqual([
			'다른 알림'
		]);
	});

	it('does not cancel a job that already went out', async () => {
		const owner = await insertTestUser({ email: 'a@b.com', nickname: '퇴근러' });
		await scheduleStandupJob({
			userId: owner.id,
			fireAt: new Date('2026-09-12T12:00:00.000Z'),
			title: '퇴근각',
			body: '보냄'
		});
		const [job] = await pendingStandupJobsForUser(owner.id);
		expect(job).toBeDefined();
		await markStandupSent(job?.id ?? '');

		try {
			await cancelStandupJob(owner.id, job?.id ?? '');
			expect.fail('should throw');
		} catch (error) {
			expect((error as AppError).code).toBe(ERROR_CODES.INVALID_REQUEST);
		}
	});

	it('clears only that user pending jobs when replacing all', async () => {
		const owner = await insertTestUser({ email: 'a@b.com', nickname: '퇴근러' });
		const other = await insertTestUser({ email: 'c@d.com', nickname: '다른사람' });
		const fireAt = new Date('2026-09-12T12:00:00.000Z');
		await scheduleStandupJob({
			userId: owner.id,
			fireAt,
			title: '퇴근각',
			body: '내 알림'
		});
		await scheduleStandupJob({
			userId: other.id,
			fireAt,
			title: '퇴근각',
			body: '다른 알림'
		});
		await cancelAllPendingStandupJobs(owner.id);
		expect(await pendingStandupJobsForUser(owner.id)).toEqual([]);
		expect((await pendingStandupJobsForUser(other.id)).map((job) => job.body)).toEqual([
			'다른 알림'
		]);
	});
});

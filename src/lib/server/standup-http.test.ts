import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireUser = vi.fn();

vi.mock('$lib/server/auth', () => ({
	requireUser: (...args: unknown[]) => requireUser(...args)
}));

vi.mock('$lib/server/push-store', () => ({
	pendingStandupJobsForUser: vi.fn(),
	cancelStandupJob: vi.fn()
}));

import { listStandupJobsResponse } from './standup-http';
import { pendingStandupJobsForUser } from '$lib/server/push-store';

describe('standup API', () => {
	beforeEach(() => {
		requireUser.mockReset();
		vi.mocked(pendingStandupJobsForUser).mockReset();
	});

	it('returns 401 when the user is missing', async () => {
		requireUser.mockRejectedValue(new AppError(ERROR_CODES.AUTH_REQUIRED));
		const response = await listStandupJobsResponse({} as never);
		expect(response.status).toBe(401);
		const body = (await response.json()) as { code?: string };
		expect(body.code).toBe(ERROR_CODES.AUTH_REQUIRED);
	});

	it('returns stored route with pending jobs', async () => {
		requireUser.mockResolvedValue({ id: 'user-1' });
		vi.mocked(pendingStandupJobsForUser).mockResolvedValue([
			{
				id: 'standup_1',
				userId: 'user-1',
				fireAt: '2026-09-12T12:00:00.000Z',
				title: '퇴근각',
				body: '18:00에 일어나면 돼요',
				sentAt: null,
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
							type: 'walk',
							startPlaceName: '회사',
							endPlaceName: '모란역',
							departureAt: '2026-09-12T09:19:00.000Z',
							arrivalAt: '2026-09-12T09:25:00.000Z',
							waitingTimeSeconds: 0
						}
					]
				}
			}
		]);

		const response = await listStandupJobsResponse({} as never);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			jobs: Array<{ route: { originName: string; lineLabel: string } | null }>;
		};
		expect(body.jobs[0]?.route?.originName).toBe('회사');
		expect(body.jobs[0]?.route?.lineLabel).toBe('8호선');
	});
});

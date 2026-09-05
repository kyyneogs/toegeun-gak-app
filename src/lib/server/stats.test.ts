import {
	formatSavedDuration,
	startOfLocalMonth,
	startOfLocalWeek,
	startOfSeoulWeek
} from '$lib/domain/commit/saved-time';
import { summarizeCommits } from '$lib/server/stats';
import type { StoredCommit } from '$lib/server/store-types';
import { describe, expect, it } from 'vitest';

function commit(
	overrides: Partial<StoredCommit> & Pick<StoredCommit, 'savedSeconds' | 'committedAt'>
): StoredCommit {
	return {
		id: 'commit_1',
		userId: 'user_1',
		recommendationId: 'rec_1',
		serviceDate: '2026-08-29',
		originName: '회사',
		destinationName: '집',
		departureAt: '2026-08-29T09:00:00.000Z',
		arrivalAt: '2026-08-29T10:00:00.000Z',
		naiveArrivalAt: '2026-08-29T10:20:00.000Z',
		criterion: 'earliestArrival',
		...overrides
	};
}

describe('summarizeCommits', () => {
	it('splits week, month, and lifetime totals', () => {
		const now = new Date(2026, 7, 29, 18, 0, 0);
		const summary = summarizeCommits(
			[
				commit({ savedSeconds: 600, committedAt: now.toISOString() }),
				commit({
					id: 'old',
					savedSeconds: 1200,
					committedAt: new Date(2026, 6, 1).toISOString()
				})
			],
			now
		);

		expect(summary.weekSeconds).toBe(600);
		expect(summary.monthSeconds).toBe(600);
		expect(summary.lifetimeSeconds).toBe(1800);
		expect(summary.lifetimeLabel).toBe(formatSavedDuration(1800));
		expect(startOfLocalWeek(now).getDate()).toBe(24);
		expect(startOfSeoulWeek(now).getTime()).toBeLessThanOrEqual(now.getTime());
		expect(startOfLocalMonth(now).getDate()).toBe(1);
	});
});

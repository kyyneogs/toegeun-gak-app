import type { RankingEntry, SavedTimeSummary } from '$lib/domain/commit/types';
import {
	formatSavedDuration,
	startOfLocalMonth,
	startOfSeoulWeek
} from '$lib/domain/commit/saved-time';
import { query } from '$lib/server/db';
import type { StoredCommit } from '$lib/server/store-types';
import { fromIso } from '$lib/utils/time';

export type { RankingEntry, SavedTimeSummary } from '$lib/domain/commit/types';

export function summarizeCommits(commits: StoredCommit[], now = new Date()): SavedTimeSummary {
	const weekStart = startOfSeoulWeek(now).getTime();
	const monthStart = startOfLocalMonth(now).getTime();
	let weekSeconds = 0;
	let monthSeconds = 0;
	let lifetimeSeconds = 0;

	for (const commit of commits) {
		lifetimeSeconds += commit.savedSeconds;
		const committedAt = fromIso(commit.committedAt).getTime();

		if (committedAt >= monthStart) {
			monthSeconds += commit.savedSeconds;
		}

		if (committedAt >= weekStart) {
			weekSeconds += commit.savedSeconds;
		}
	}

	return {
		weekSeconds,
		monthSeconds,
		lifetimeSeconds,
		weekLabel: formatSavedDuration(weekSeconds),
		monthLabel: formatSavedDuration(monthSeconds),
		lifetimeLabel: formatSavedDuration(lifetimeSeconds),
		commitCount: commits.length
	};
}

export async function weeklyRanking(now = new Date()): Promise<{ saved: RankingEntry[] }> {
	const weekStart = startOfSeoulWeek(now);
	const rows = await query<{
		nickname: string;
		saved_seconds: string | number;
		commit_count: string | number;
	}>(
		`SELECT
			users.nickname AS nickname,
			SUM(commits.saved_seconds)::int AS saved_seconds,
			COUNT(*)::int AS commit_count
		FROM commits
		INNER JOIN users ON users.id = commits.user_id
		WHERE users.ranking_opt_in = TRUE AND commits.committed_at >= $1
		GROUP BY users.id, users.nickname
		HAVING SUM(commits.saved_seconds) > 0`,
		[weekStart.toISOString()]
	);

	const entries: RankingEntry[] = rows.map((row) => {
		const savedSeconds = Number(row.saved_seconds);

		return {
			nickname: String(row.nickname),
			savedSeconds,
			savedLabel: formatSavedDuration(savedSeconds),
			commitCount: Number(row.commit_count)
		};
	});

	return {
		saved: [...entries].sort((left, right) => right.savedSeconds - left.savedSeconds)
	};
}

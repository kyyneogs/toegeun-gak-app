export const RECOMMENDATION_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
export const COMMIT_DAILY_LIMIT = 8;
export const STANDUP_LEAD_MINUTE_OPTIONS = [0, 3, 5, 10, 15] as const;
export const DEFAULT_STANDUP_LEAD_MINUTES = 5;
export const PUSH_DISPATCH_INTERVAL_MS = 30_000;
export const SEOUL_TIME_ZONE = 'Asia/Seoul';
export const ROUTE_SEARCH_TIMEOUT_MS = 8_000;
export const ROUTE_TIMING_TIMEOUT_MS = 12_000;
export const AI_PICK_TIMEOUT_MS = 8_000;
export const RECOMMEND_MAX_DURATION_SECONDS = Math.ceil(
	(ROUTE_SEARCH_TIMEOUT_MS + ROUTE_TIMING_TIMEOUT_MS) / 1000
);
export const AI_PICK_MAX_DURATION_SECONDS = Math.ceil(AI_PICK_TIMEOUT_MS / 1000) + 2;
export const CRON_MAX_DURATION_SECONDS = 10;
export const AI_HAIKU_MODEL = 'claude-haiku-4-5';

export type StandupLeadMinutes = (typeof STANDUP_LEAD_MINUTE_OPTIONS)[number];

export function isStandupLeadMinutes(value: unknown): value is StandupLeadMinutes {
	return (
		typeof value === 'number' && STANDUP_LEAD_MINUTE_OPTIONS.some((option) => option === value)
	);
}

export function clampStandupLeadMinutes(value: unknown): StandupLeadMinutes {
	if (isStandupLeadMinutes(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim() !== '') {
		return clampStandupLeadMinutes(Number(value));
	}

	return DEFAULT_STANDUP_LEAD_MINUTES;
}

export function standupLeadMs(minutes: unknown): number {
	return clampStandupLeadMinutes(minutes) * 60 * 1000;
}

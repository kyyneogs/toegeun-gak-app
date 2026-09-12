import { clampStandupLeadMinutes } from '$lib/constants/persist';
import type { StoredCommit, StoredPushSubscription, StoredUser } from '$lib/server/store-types';

export function mapUser(row: Record<string, unknown>): StoredUser {
	return {
		id: String(row.id),
		email: String(row.email),
		nickname: String(row.nickname),
		rankingOptIn: asBoolean(row.ranking_opt_in),
		standupLeadMinutes: clampStandupLeadMinutes(row.standup_lead_minutes),
		createdAt: toIsoText(row.created_at)
	};
}

export function mapCommit(row: Record<string, unknown>): StoredCommit {
	return {
		id: String(row.id),
		userId: String(row.user_id),
		recommendationId: String(row.recommendation_id),
		serviceDate: String(row.service_date),
		committedAt: toIsoText(row.committed_at),
		originName: String(row.origin_name),
		destinationName: String(row.destination_name),
		departureAt: toIsoText(row.departure_at),
		arrivalAt: toIsoText(row.arrival_at),
		naiveArrivalAt: toIsoText(row.naive_arrival_at),
		savedSeconds: Number(row.saved_seconds),
		criterion: String(row.criterion)
	};
}

export function mapPushSubscription(row: Record<string, unknown>): StoredPushSubscription {
	return {
		userId: String(row.user_id),
		endpoint: String(row.endpoint),
		p256dh: String(row.p256dh),
		auth: String(row.auth)
	};
}

function asBoolean(value: unknown): boolean {
	if (value === true || value === 1 || value === 't' || value === 'true') {
		return true;
	}

	return false;
}

export function toIsoText(value: unknown): string {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return String(value);
}

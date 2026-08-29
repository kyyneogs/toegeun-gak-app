import { CANDIDATE_INTERVAL_MINUTES } from '$lib/constants/recommendation';
import { addMinutes } from '$lib/utils/time';

export function generateDepartureCandidates(
	departureFrom: Date,
	departureUntil: Date,
	intervalMinutes = CANDIDATE_INTERVAL_MINUTES
): Date[] {
	if (departureUntil.getTime() < departureFrom.getTime()) {
		return [];
	}

	const candidates: Date[] = [];
	let cursor = new Date(departureFrom);

	while (cursor.getTime() <= departureUntil.getTime()) {
		candidates.push(new Date(cursor));
		cursor = addMinutes(cursor, intervalMinutes);
	}

	return candidates;
}

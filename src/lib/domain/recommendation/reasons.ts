import {
	LOW_WAITING_TIME_SECONDS,
	NEAR_BEST_TOTAL_TIME_SECONDS
} from '$lib/constants/recommendation';
import {
	REASON_CODES,
	type ReasonCode,
	type ScoredCandidate
} from '$lib/domain/recommendation/types';
import { fromIso, minutesBetween } from '$lib/utils/time';

export function assignReasonCodes(
	recommended: ScoredCandidate,
	allCandidates: ScoredCandidate[]
): ReasonCode[] {
	const codes: ReasonCode[] = [];
	const shortestTotal = Math.min(...allCandidates.map((candidate) => candidate.totalTimeSeconds));
	const lowestWait = Math.min(...allCandidates.map((candidate) => candidate.waitingTimeSeconds));
	const fewestTransfers = Math.min(...allCandidates.map((candidate) => candidate.transferCount));
	const earliest = allCandidates.reduce((current, candidate) =>
		fromIso(candidate.departureAt) < fromIso(current.departureAt) ? candidate : current
	);

	if (recommended.totalTimeSeconds <= shortestTotal + NEAR_BEST_TOTAL_TIME_SECONDS) {
		codes.push(REASON_CODES.SHORT_TOTAL_TRAVEL_TIME);
	}

	if (
		recommended.waitingTimeSeconds <= LOW_WAITING_TIME_SECONDS ||
		recommended.waitingTimeSeconds === lowestWait
	) {
		codes.push(REASON_CODES.LOW_WAITING_TIME);
	}

	const laterThanEarliest =
		minutesBetween(fromIso(earliest.departureAt), fromIso(recommended.departureAt)) > 0;
	const noMeaningfulTimePenalty =
		recommended.totalTimeSeconds <= earliest.totalTimeSeconds + NEAR_BEST_TOTAL_TIME_SECONDS;

	if (laterThanEarliest && noMeaningfulTimePenalty) {
		codes.push(REASON_CODES.LATE_DEPARTURE_WITHOUT_TIME_PENALTY);
	}

	if (recommended.transferCount === fewestTransfers) {
		codes.push(REASON_CODES.FEWER_TRANSFERS);
	}

	return codes;
}

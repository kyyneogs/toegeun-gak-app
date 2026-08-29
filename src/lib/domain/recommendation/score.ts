import {
	REFERENCE_TOTAL_TIME_SECONDS,
	REFERENCE_WAITING_TIME_SECONDS,
	WEIGHT_EARLY_DEPARTURE,
	WEIGHT_TOTAL_TIME,
	WEIGHT_TRANSFER,
	WEIGHT_WAITING_TIME
} from '$lib/constants/recommendation';
import { minutesBetween } from '$lib/utils/time';

export interface ScoreInputs {
	totalTimeSeconds: number;
	waitingTimeSeconds: number;
	transferCount: number;
	departureAt: Date;
	windowStart: Date;
	windowEnd: Date;
}

export function scoreCandidate(input: ScoreInputs): number {
	const windowMinutes = Math.max(1, minutesBetween(input.windowStart, input.windowEnd));
	const laterMinutes = Math.max(0, minutesBetween(input.windowStart, input.departureAt));
	const normalizedTotalTime = input.totalTimeSeconds / REFERENCE_TOTAL_TIME_SECONDS;
	const normalizedWaitingTime = input.waitingTimeSeconds / REFERENCE_WAITING_TIME_SECONDS;
	const laterDeparturePenalty = laterMinutes / windowMinutes;

	return (
		WEIGHT_TOTAL_TIME * normalizedTotalTime +
		WEIGHT_WAITING_TIME * normalizedWaitingTime +
		WEIGHT_TRANSFER * input.transferCount +
		WEIGHT_EARLY_DEPARTURE * laterDeparturePenalty
	);
}

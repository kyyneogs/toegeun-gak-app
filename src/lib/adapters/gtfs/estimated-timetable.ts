import {
	MOCK_BUS_INTERVAL_MINUTES,
	MOCK_FIRST_BUS,
	MOCK_LAST_BUS
} from '$lib/constants/recommendation';
import { nextBusAt } from '$lib/domain/route/headway';
import type { TimetableDeparture, TimetableLookup } from '$lib/domain/route/timetable';
import type { TimetablePort } from '$lib/ports/timetable-port';
import { combineLocalDateAndClock } from '$lib/utils/time';

export class EstimatedTimetable implements TimetablePort {
	async nextDeparture(query: TimetableLookup): Promise<TimetableDeparture | null> {
		const firstBus = combineLocalDateAndClock(MOCK_FIRST_BUS, query.after);
		const lastBus = combineLocalDateAndClock(MOCK_LAST_BUS, query.after);
		const departureAt = nextBusAt(query.after, firstBus, lastBus, MOCK_BUS_INTERVAL_MINUTES);

		if (!departureAt) {
			return null;
		}

		return { departureAt, source: 'estimated' };
	}
}

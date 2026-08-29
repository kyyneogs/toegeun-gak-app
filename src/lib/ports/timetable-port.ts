import type { TimetableDeparture, TimetableLookup } from '$lib/domain/route/timetable';

export interface TimetablePort {
	nextDeparture(query: TimetableLookup): Promise<TimetableDeparture | null>;
}

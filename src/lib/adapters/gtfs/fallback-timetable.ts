import type { TimetableDeparture, TimetableLookup } from '$lib/domain/route/timetable';
import type { TimetablePort } from '$lib/ports/timetable-port';

export class FallbackTimetable implements TimetablePort {
	constructor(
		private readonly primary: TimetablePort | null,
		private readonly fallback: TimetablePort
	) {}

	async nextDeparture(query: TimetableLookup): Promise<TimetableDeparture | null> {
		if (this.primary) {
			try {
				const hit = await this.primary.nextDeparture(query);

				if (hit) {
					return hit;
				}
			} catch (cause) {
				console.error('GTFS timetable lookup failed', cause);
			}
		}

		return this.fallback.nextDeparture(query);
	}
}

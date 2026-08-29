const GTFS_CLOCK_PATTERN = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/;

export function parseGtfsClockToSeconds(clock: string): number | null {
	const match = GTFS_CLOCK_PATTERN.exec(clock.trim());

	if (!match) {
		return null;
	}

	return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

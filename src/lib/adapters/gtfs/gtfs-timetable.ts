import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { forEachCsvRow } from '$lib/adapters/gtfs/gtfs-csv-reader';
import {
	extractRouteShortName,
	isStopNameMatch,
	normalizeStopName
} from '$lib/adapters/gtfs/gtfs-match';
import type { TimetableDeparture, TimetableLookup } from '$lib/domain/route/timetable';
import type { TimetablePort } from '$lib/ports/timetable-port';
import { addSeconds, startOfLocalDay } from '$lib/utils/time';

export const GTFS_REQUIRED_FILES = [
	'routes.txt',
	'stops.txt',
	'trips.txt',
	'stop_times.txt',
	'calendar.txt'
] as const;

const GTFS_CLOCK_PATTERN = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/;
const CALENDAR_DAY_COLUMNS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
] as const;

interface CalendarService {
	startDate: string;
	endDate: string;
	days: readonly string[];
}

interface TripRecord {
	tripId: string;
	serviceId: string;
}

interface GtfsIndex {
	routeIdsByShortName: Map<string, string[]>;
	stopIdsByExactName: Map<string, string[]>;
	stopIdsByNormalizedName: Map<string, string[]>;
	tripsByRouteId: Map<string, TripRecord[]>;
	calendarByServiceId: Map<string, CalendarService>;
}

export class GtfsTimetable implements TimetablePort {
	private indexPromise: Promise<GtfsIndex> | null = null;
	private readonly stopTimesByTripStop = new Map<string, number[]>();
	private readonly loadedTripIds = new Set<string>();

	constructor(private readonly directory: string) {}

	async nextDeparture(query: TimetableLookup): Promise<TimetableDeparture | null> {
		const shortName = extractRouteShortName(query.routeName);

		if (!shortName || !query.stopName.trim()) {
			return null;
		}

		const index = await this.ensureIndex();
		const routeIds = index.routeIdsByShortName.get(shortName) ?? [];
		const stopIds = matchStopIds(index, query.stopName);

		if (routeIds.length === 0 || stopIds.length === 0) {
			return null;
		}

		const activeTrips = collectActiveTrips(index, routeIds, query.after);

		if (activeTrips.length === 0) {
			return null;
		}

		await this.ensureStopTimes(activeTrips.map((trip) => trip.tripId));

		const afterSeconds = secondsFromMidnight(query.after);
		let bestSeconds: number | null = null;

		for (const trip of activeTrips) {
			for (const stopId of stopIds) {
				const times = this.stopTimesByTripStop.get(tripStopKey(trip.tripId, stopId));

				if (!times) {
					continue;
				}

				for (const timeSeconds of times) {
					if (timeSeconds >= afterSeconds && (bestSeconds === null || timeSeconds < bestSeconds)) {
						bestSeconds = timeSeconds;
					}
				}
			}
		}

		if (bestSeconds === null) {
			return null;
		}

		return {
			departureAt: addSeconds(startOfLocalDay(query.after), bestSeconds),
			source: 'gtfs'
		};
	}

	private ensureIndex(): Promise<GtfsIndex> {
		if (!this.indexPromise) {
			this.indexPromise = loadGtfsIndex(this.directory).catch((cause) => {
				this.indexPromise = null;
				throw cause;
			});
		}

		return this.indexPromise;
	}

	private async ensureStopTimes(tripIds: string[]): Promise<void> {
		const missing = tripIds.filter((tripId) => !this.loadedTripIds.has(tripId));

		if (missing.length === 0) {
			return;
		}

		const missingSet = new Set(missing);

		await forEachCsvRow(join(this.directory, 'stop_times.txt'), (row) => {
			if (!missingSet.has(row.trip_id)) {
				return;
			}

			const seconds = parseGtfsClockToSeconds(row.departure_time || row.arrival_time);

			if (seconds === null) {
				return;
			}

			const key = tripStopKey(row.trip_id, row.stop_id);
			const times = this.stopTimesByTripStop.get(key) ?? [];
			times.push(seconds);
			this.stopTimesByTripStop.set(key, times);
		});

		for (const tripId of missing) {
			this.loadedTripIds.add(tripId);
		}
	}
}

export function tryCreateGtfsTimetable(directory: string | undefined): GtfsTimetable | null {
	const trimmed = directory?.trim() ?? '';

	if (!trimmed) {
		return null;
	}

	const resolved = resolveGtfsDirectory(trimmed);
	const missing = GTFS_REQUIRED_FILES.filter((fileName) => !existsSync(join(resolved, fileName)));

	if (missing.length > 0) {
		console.error('GTFS_DIR is missing required files', {
			directory: trimmed,
			resolved,
			cwd: process.cwd(),
			missing
		});
		return null;
	}

	console.info('GTFS timetable enabled', { directory: resolved });
	return new GtfsTimetable(resolved);
}

function resolveGtfsDirectory(directory: string): string {
	if (isAbsolute(directory)) {
		return directory;
	}

	const fromCwd = resolve(process.cwd(), directory);

	if (hasRequiredGtfsFiles(fromCwd)) {
		return fromCwd;
	}

	const fromDev = resolve(process.cwd(), 'dev', directory);

	if (hasRequiredGtfsFiles(fromDev)) {
		return fromDev;
	}

	return fromCwd;
}

function hasRequiredGtfsFiles(directory: string): boolean {
	return GTFS_REQUIRED_FILES.every((fileName) => existsSync(join(directory, fileName)));
}

async function loadGtfsIndex(directory: string): Promise<GtfsIndex> {
	const routeIdsByShortName = new Map<string, string[]>();
	const stopIdsByExactName = new Map<string, string[]>();
	const stopIdsByNormalizedName = new Map<string, string[]>();
	const tripsByRouteId = new Map<string, TripRecord[]>();
	const calendarByServiceId = new Map<string, CalendarService>();

	await forEachCsvRow(join(directory, 'routes.txt'), (row) => {
		const shortName = extractRouteShortName(row.route_short_name ?? '');

		if (!shortName || !row.route_id) {
			return;
		}

		pushMapValue(routeIdsByShortName, shortName, row.route_id);

		if (shortName.endsWith('선') && shortName.length > 1) {
			pushMapValue(routeIdsByShortName, shortName.slice(0, -1), row.route_id);
		}
	});

	await forEachCsvRow(join(directory, 'stops.txt'), (row) => {
		if (!row.stop_id || !row.stop_name) {
			return;
		}

		pushMapValue(stopIdsByExactName, row.stop_name.trim(), row.stop_id);
		pushMapValue(stopIdsByNormalizedName, normalizeStopName(row.stop_name), row.stop_id);
	});

	await forEachCsvRow(join(directory, 'calendar.txt'), (row) => {
		if (!row.service_id) {
			return;
		}

		calendarByServiceId.set(row.service_id, {
			startDate: row.start_date ?? '',
			endDate: row.end_date ?? '',
			days: CALENDAR_DAY_COLUMNS.map((column) => row[column] ?? '0')
		});
	});

	await forEachCsvRow(join(directory, 'trips.txt'), (row) => {
		if (!row.route_id || !row.trip_id || !row.service_id) {
			return;
		}

		const trips = tripsByRouteId.get(row.route_id) ?? [];
		trips.push({ tripId: row.trip_id, serviceId: row.service_id });
		tripsByRouteId.set(row.route_id, trips);
	});

	return {
		routeIdsByShortName,
		stopIdsByExactName,
		stopIdsByNormalizedName,
		tripsByRouteId,
		calendarByServiceId
	};
}

function matchStopIds(index: GtfsIndex, stopName: string): string[] {
	const trimmed = stopName.trim();
	const exact = index.stopIdsByExactName.get(trimmed);

	if (exact && exact.length > 0) {
		return exact;
	}

	const normalized = index.stopIdsByNormalizedName.get(normalizeStopName(trimmed));

	if (normalized && normalized.length > 0) {
		return normalized;
	}

	const prefixHits: string[] = [];

	for (const [gtfsName, stopIds] of index.stopIdsByExactName) {
		if (isStopNameMatch(trimmed, gtfsName)) {
			prefixHits.push(...stopIds);
		}
	}

	return prefixHits;
}

function collectActiveTrips(index: GtfsIndex, routeIds: string[], after: Date): TripRecord[] {
	const active: TripRecord[] = [];

	for (const routeId of routeIds) {
		for (const trip of index.tripsByRouteId.get(routeId) ?? []) {
			if (isServiceActive(index.calendarByServiceId.get(trip.serviceId), after)) {
				active.push(trip);
			}
		}
	}

	return active;
}

function isServiceActive(calendar: CalendarService | undefined, date: Date): boolean {
	if (!calendar) {
		return false;
	}

	const ymd = toGtfsDate(date);

	if (calendar.startDate && ymd < calendar.startDate) {
		return false;
	}

	if (calendar.endDate && ymd > calendar.endDate) {
		return false;
	}

	return calendar.days[date.getDay()] === '1';
}

function toGtfsDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

function secondsFromMidnight(date: Date): number {
	return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export function parseGtfsClockToSeconds(clock: string): number | null {
	const match = GTFS_CLOCK_PATTERN.exec(clock.trim());

	if (!match) {
		return null;
	}

	return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function tripStopKey(tripId: string, stopId: string): string {
	return `${tripId}\0${stopId}`;
}

function pushMapValue(map: Map<string, string[]>, key: string, value: string): void {
	const values = map.get(key) ?? [];
	values.push(value);
	map.set(key, values);
}

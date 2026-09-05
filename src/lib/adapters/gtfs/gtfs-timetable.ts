import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import '$lib/adapters/gtfs/gtfs-client-guard';
import { forEachCsvRow } from '$lib/adapters/gtfs/gtfs-csv-reader';
import { loadStopTimesForTrips } from '$lib/adapters/gtfs/gtfs-stop-times';
import { nextBoardAndAlight, type StopTimePoint } from '$lib/adapters/gtfs/gtfs-board-alight';
import {
	calendarDateKey,
	GTFS_CALENDAR_DAY_COLUMNS,
	GTFS_EXCEPTION_ADDED,
	GTFS_EXCEPTION_REMOVED,
	isCalendarServiceActive,
	toGtfsDate,
	type GtfsCalendarWindow
} from '$lib/adapters/gtfs/gtfs-calendar';
import {
	extractRouteShortName,
	isStopNameMatch,
	normalizeStopName,
	routeShortNameKeys
} from '$lib/adapters/gtfs/gtfs-match';
import type { TripChoice } from '$lib/domain/optimization/types';
import type { NextTripQuery, TimetablePort } from '$lib/ports/timetable-port';
import { addSeconds, startOfLocalDay } from '$lib/utils/time';
import type { GeoPoint } from '$lib/utils/geo';

export const GTFS_REQUIRED_FILES = [
	'routes.txt',
	'stops.txt',
	'trips.txt',
	'stop_times.txt',
	'calendar.txt'
] as const;

const CALENDAR_DATES_FILE = 'calendar_dates.txt';

interface TripRecord {
	tripId: string;
	serviceId: string;
	routeId: string;
}

interface GtfsIndex {
	routeIdsByShortName: Map<string, string[]>;
	stopIdsByExactName: Map<string, string[]>;
	stopIdsByNormalizedName: Map<string, string[]>;
	tripsByRouteId: Map<string, TripRecord[]>;
	calendarByServiceId: Map<string, GtfsCalendarWindow>;
	calendarDateExceptions: Map<string, string>;
	coordinatesByStopId: Map<string, GeoPoint>;
}

export class GtfsTimetable implements TimetablePort {
	private indexPromise: Promise<GtfsIndex> | null = null;
	private readonly stopTimesByTrip = new Map<string, StopTimePoint[]>();
	private readonly loadedTripIds = new Set<string>();
	private readonly queuedTripIds = new Set<string>();
	private stopTimesLoad: Promise<void> | null = null;

	constructor(private readonly directory: string) {}

	async prepare(routeIds: string[], serviceDate: Date): Promise<void> {
		const index = await this.ensureIndex();
		const tripIds: string[] = [];

		for (const routeId of routeIds) {
			const gtfsRouteIds = resolveRouteIds(index, routeId);
			for (const trip of collectActiveTrips(index, gtfsRouteIds, serviceDate)) {
				tripIds.push(trip.tripId);
			}
		}

		await this.ensureStopTimes(tripIds);
	}

	async findStopCoordinates(stopName: string): Promise<GeoPoint[]> {
		const index = await this.ensureIndex();
		const points: GeoPoint[] = [];

		for (const stopId of matchStopIds(index, stopName)) {
			const point = index.coordinatesByStopId.get(stopId);

			if (point) {
				points.push(point);
			}
		}

		return points;
	}

	async findNextTrip(query: NextTripQuery): Promise<TripChoice | null> {
		const index = await this.ensureIndex();
		const routeIds = resolveRouteIds(index, query.routeId);
		const boardStopIds = matchStopIds(index, query.boardStopName);
		const alightStopIds = matchStopIds(index, query.alightStopName);

		if (routeIds.length === 0 || boardStopIds.length === 0 || alightStopIds.length === 0) {
			return null;
		}

		const boardStops = new Set(boardStopIds);
		const alightStops = new Set(alightStopIds);
		const activeTrips = collectActiveTrips(index, routeIds, query.serviceDate);

		if (activeTrips.length === 0) {
			return null;
		}

		await this.ensureStopTimes(activeTrips.map((trip) => trip.tripId));

		const afterSeconds = secondsSinceServiceStart(query.after, query.serviceDate);
		let best: { trip: TripRecord; boardSeconds: number; alightSeconds: number } | null = null;

		for (const trip of activeTrips) {
			const points = this.stopTimesByTrip.get(trip.tripId);

			if (!points) {
				continue;
			}

			const next = nextBoardAndAlight(points, boardStops, alightStops, afterSeconds);

			if (!next) {
				continue;
			}

			if (!best || next.boardSeconds < best.boardSeconds) {
				best = { trip, boardSeconds: next.boardSeconds, alightSeconds: next.alightSeconds };
			}
		}

		if (!best) {
			return null;
		}

		const serviceStart = startOfLocalDay(query.serviceDate);

		return {
			routeId: query.routeId,
			tripId: best.trip.tripId,
			boardTime: addSeconds(serviceStart, best.boardSeconds),
			alightTime: addSeconds(serviceStart, best.alightSeconds)
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
		for (const tripId of tripIds) {
			if (!this.loadedTripIds.has(tripId)) {
				this.queuedTripIds.add(tripId);
			}
		}

		if (this.queuedTripIds.size === 0 && !this.stopTimesLoad) {
			return;
		}

		await Promise.resolve();

		if (!this.stopTimesLoad) {
			this.stopTimesLoad = this.flushStopTimesQueue().finally(() => {
				this.stopTimesLoad = null;
			});
		}

		await this.stopTimesLoad;

		const stillMissing = tripIds.filter((tripId) => !this.loadedTripIds.has(tripId));

		if (stillMissing.length > 0) {
			await this.ensureStopTimes(stillMissing);
		}
	}

	private async flushStopTimesQueue(): Promise<void> {
		const missing = [...this.queuedTripIds].filter((tripId) => !this.loadedTripIds.has(tripId));
		this.queuedTripIds.clear();

		if (missing.length === 0) {
			return;
		}

		const startedAt = Date.now();
		await loadStopTimesForTrips(
			join(this.directory, 'stop_times.txt'),
			new Set(missing),
			this.stopTimesByTrip
		);

		for (const tripId of missing) {
			this.loadedTripIds.add(tripId);
		}

		console.info('GTFS stop_times indexed', {
			trips: missing.length,
			ms: Date.now() - startedAt
		});
	}
}

export class EmptyTimetable implements TimetablePort {
	async prepare(_routeIds: string[], _serviceDate: Date): Promise<void> {
		void _routeIds;
		void _serviceDate;
	}

	async findNextTrip(_query: NextTripQuery): Promise<TripChoice | null> {
		void _query;
		return null;
	}

	async findStopCoordinates(_stopName: string): Promise<GeoPoint[]> {
		void _stopName;
		return [];
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

	if (import.meta.env.PROD) {
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
	const calendarByServiceId = new Map<string, GtfsCalendarWindow>();
	const calendarDateExceptions = new Map<string, string>();
	const coordinatesByStopId = new Map<string, GeoPoint>();

	await forEachCsvRow(join(directory, 'routes.txt'), (row) => {
		const shortName = extractRouteShortName(row.route_short_name ?? '');

		if (!shortName || !row.route_id) {
			return;
		}

		for (const key of routeShortNameKeys(shortName)) {
			pushMapValue(routeIdsByShortName, key, row.route_id);
		}
	});

	await forEachCsvRow(join(directory, 'stops.txt'), (row) => {
		if (!row.stop_id || !row.stop_name) {
			return;
		}

		pushMapValue(stopIdsByExactName, row.stop_name.trim(), row.stop_id);
		pushMapValue(stopIdsByNormalizedName, normalizeStopName(row.stop_name), row.stop_id);

		const latitude = Number.parseFloat(row.stop_lat ?? '');
		const longitude = Number.parseFloat(row.stop_lon ?? '');

		if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
			coordinatesByStopId.set(row.stop_id, { latitude, longitude });
		}
	});

	await forEachCsvRow(join(directory, 'calendar.txt'), (row) => {
		if (!row.service_id) {
			return;
		}

		calendarByServiceId.set(row.service_id, {
			startDate: row.start_date ?? '',
			endDate: row.end_date ?? '',
			days: GTFS_CALENDAR_DAY_COLUMNS.map((column) => row[column] ?? '0')
		});
	});

	const calendarDatesPath = join(directory, CALENDAR_DATES_FILE);

	if (existsSync(calendarDatesPath)) {
		await forEachCsvRow(calendarDatesPath, (row) => {
			if (
				!row.service_id ||
				!row.date ||
				(row.exception_type !== GTFS_EXCEPTION_ADDED &&
					row.exception_type !== GTFS_EXCEPTION_REMOVED)
			) {
				return;
			}

			calendarDateExceptions.set(calendarDateKey(row.service_id, row.date), row.exception_type);
		});
	} else {
		console.info('GTFS calendar_dates.txt is absent; using calendar.txt only', { directory });
	}

	await forEachCsvRow(join(directory, 'trips.txt'), (row) => {
		if (!row.route_id || !row.trip_id || !row.service_id) {
			return;
		}

		const trips = tripsByRouteId.get(row.route_id) ?? [];
		trips.push({ tripId: row.trip_id, serviceId: row.service_id, routeId: row.route_id });
		tripsByRouteId.set(row.route_id, trips);
	});

	return {
		routeIdsByShortName,
		stopIdsByExactName,
		stopIdsByNormalizedName,
		tripsByRouteId,
		calendarByServiceId,
		calendarDateExceptions,
		coordinatesByStopId
	};
}

function resolveRouteIds(index: GtfsIndex, candidateRouteId: string): string[] {
	const shortName = extractRouteShortName(candidateRouteId);

	if (shortName) {
		const matched = index.routeIdsByShortName.get(shortName);

		if (matched && matched.length > 0) {
			return matched;
		}
	}

	if (index.tripsByRouteId.has(candidateRouteId)) {
		return [candidateRouteId];
	}

	return [];
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

function collectActiveTrips(index: GtfsIndex, routeIds: string[], serviceDate: Date): TripRecord[] {
	const active: TripRecord[] = [];

	for (const routeId of routeIds) {
		for (const trip of index.tripsByRouteId.get(routeId) ?? []) {
			if (isServiceActive(index, trip.serviceId, serviceDate)) {
				active.push(trip);
			}
		}
	}

	return active;
}

function isServiceActive(index: GtfsIndex, serviceId: string, date: Date): boolean {
	const ymd = toGtfsDate(date);
	return isCalendarServiceActive(
		index.calendarDateExceptions.get(calendarDateKey(serviceId, ymd)),
		index.calendarByServiceId.get(serviceId),
		date
	);
}

function secondsSinceServiceStart(at: Date, serviceDate: Date): number {
	return (at.getTime() - startOfLocalDay(serviceDate).getTime()) / 1000;
}

function pushMapValue(map: Map<string, string[]>, key: string, value: string): void {
	const values = map.get(key) ?? [];
	values.push(value);
	map.set(key, values);
}

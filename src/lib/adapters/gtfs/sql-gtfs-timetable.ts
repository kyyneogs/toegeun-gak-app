import { parseGtfsClockToSeconds } from '$lib/adapters/gtfs/gtfs-clock';
import { nextBoardAndAlight, type StopTimePoint } from '$lib/adapters/gtfs/gtfs-board-alight';
import {
	calendarDateKey,
	GTFS_CALENDAR_DAY_COLUMNS,
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
import { query, queryOne } from '$lib/server/db';
import { addSeconds, startOfLocalDay } from '$lib/utils/time';
import type { GeoPoint } from '$lib/utils/geo';

type SqlStopRow = {
	stop_id: string;
	stop_name: string;
	stop_lat: number | null;
	stop_lon: number | null;
};

type SqlTripRow = {
	trip_id: string;
	route_id: string;
	service_id: string;
};

type SqlCalendarRow = {
	service_id: string;
	start_date: string;
	end_date: string;
	sunday: string;
	monday: string;
	tuesday: string;
	wednesday: string;
	thursday: string;
	friday: string;
	saturday: string;
};

type SqlExceptionRow = {
	service_id: string;
	date: string;
	exception_type: string;
};

type SqlStopTimeRow = {
	trip_id: string;
	stop_id: string;
	stop_sequence: number;
	arrival_time: string;
	departure_time: string;
};

type SqlRouteRow = {
	route_id: string;
	route_short_name: string;
};

export async function hasSqlGtfsSlice(): Promise<boolean> {
	try {
		const row = await queryOne<{ ok: number }>(
			'SELECT 1 AS ok FROM gtfs_routes WHERE route_short_name IS NOT NULL LIMIT 1'
		);
		return Boolean(row);
	} catch (cause) {
		console.error('SQL GTFS lookup failed', cause);
		return false;
	}
}

const STOP_NAME_CANDIDATE_LIMIT = 80;
const TRIP_ID_IN_CHUNK = 200;

export class SqlGtfsTimetable implements TimetablePort {
	private readonly routeIdsByCandidate = new Map<string, Promise<string[]>>();
	private readonly stopMatchesByName = new Map<string, Promise<SqlStopRow[]>>();
	private readonly activeTripsByRouteAndDate = new Map<string, Promise<SqlTripRow[]>>();
	private readonly calendarsByServiceSet = new Map<
		string,
		Promise<Map<string, GtfsCalendarWindow>>
	>();
	private readonly exceptionsByServiceSetAndDate = new Map<string, Promise<Map<string, string>>>();
	private readonly stopTimesByTripAndStops = new Map<string, StopTimePoint[]>();

	async prepare(routeIds: string[], serviceDate: Date): Promise<void> {
		await Promise.all(
			[...new Set(routeIds)].map((routeId) => this.activeTripsForRoute(routeId, serviceDate))
		);
	}

	async findStopCoordinates(stopName: string): Promise<GeoPoint[]> {
		const points: GeoPoint[] = [];

		for (const stop of await this.matchStops(stopName)) {
			if (stop.stop_lat != null && stop.stop_lon != null) {
				points.push({ latitude: Number(stop.stop_lat), longitude: Number(stop.stop_lon) });
			}
		}

		return points;
	}

	async findNextTrip(query: NextTripQuery): Promise<TripChoice | null> {
		const boardStops = await this.matchStops(query.boardStopName);
		const alightStops = await this.matchStops(query.alightStopName);
		const activeTrips = await this.activeTripsForRoute(query.routeId, query.serviceDate);

		if (boardStops.length === 0 || alightStops.length === 0 || activeTrips.length === 0) {
			return null;
		}

		const boardIds = new Set(boardStops.map((stop) => stop.stop_id));
		const alightIds = new Set(alightStops.map((stop) => stop.stop_id));
		const relevantStopIds = [...new Set([...boardIds, ...alightIds])];
		await this.ensureStopTimes(
			activeTrips.map((trip) => trip.trip_id),
			relevantStopIds
		);

		const afterSeconds = secondsSinceServiceStart(query.after, query.serviceDate);
		let best: { trip: SqlTripRow; boardSeconds: number; alightSeconds: number } | null = null;

		for (const trip of activeTrips) {
			const points = this.stopTimesByTripAndStops.get(stopTimesKey(trip.trip_id, relevantStopIds));

			if (!points) {
				continue;
			}

			const next = nextBoardAndAlight(points, boardIds, alightIds, afterSeconds);

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
			tripId: best.trip.trip_id,
			boardTime: addSeconds(serviceStart, best.boardSeconds),
			alightTime: addSeconds(serviceStart, best.alightSeconds)
		};
	}

	private async matchStops(stopName: string): Promise<SqlStopRow[]> {
		const cacheKey = stopName.trim();
		const cached = this.stopMatchesByName.get(cacheKey);

		if (cached) {
			return cached;
		}

		const pending = this.loadMatchedStops(stopName).catch((cause) => {
			this.stopMatchesByName.delete(cacheKey);
			throw cause;
		});
		this.stopMatchesByName.set(cacheKey, pending);
		return pending;
	}

	private async loadMatchedStops(stopName: string): Promise<SqlStopRow[]> {
		const trimmed = stopName.trim();

		if (!trimmed) {
			return [];
		}

		const lookupNames = uniqueStopNameLookups(trimmed);
		const exactClause = inClause(lookupNames);
		const exactRows = await query<SqlStopRow>(
			`SELECT stop_id, stop_name, stop_lat, stop_lon FROM gtfs_stops WHERE stop_name IN (${exactClause.sql})`,
			exactClause.params
		);
		const exact = exactRows.filter((stop) => stop.stop_name === trimmed);

		if (exact.length > 0) {
			return exact;
		}

		const normalized = normalizeStopName(trimmed);
		const byNormalized = exactRows.filter(
			(stop) => normalizeStopName(stop.stop_name) === normalized
		);

		if (byNormalized.length > 0) {
			return byNormalized;
		}

		const prefixes = [...new Set([trimmed, normalized].filter((value) => value.length > 0))];
		const likeClause = prefixes.map((_, index) => `stop_name LIKE $${index + 1}`).join(' OR ');
		const prefixRows = await query<SqlStopRow>(
			`SELECT stop_id, stop_name, stop_lat, stop_lon
			 FROM gtfs_stops
			 WHERE ${likeClause}
			 LIMIT ${STOP_NAME_CANDIDATE_LIMIT}`,
			prefixes.map((value) => `${value}%`)
		);

		return prefixRows.filter((stop) => isStopNameMatch(trimmed, stop.stop_name));
	}

	private async activeTripsForRoute(routeId: string, serviceDate: Date): Promise<SqlTripRow[]> {
		const cacheKey = `${toGtfsDate(serviceDate)}:${routeId}`;
		const cached = this.activeTripsByRouteAndDate.get(cacheKey);

		if (cached) {
			return cached;
		}

		const pending = this.loadActiveTripsForRoute(routeId, serviceDate).catch((cause) => {
			this.activeTripsByRouteAndDate.delete(cacheKey);
			throw cause;
		});
		this.activeTripsByRouteAndDate.set(cacheKey, pending);
		return pending;
	}

	private async loadActiveTripsForRoute(routeId: string, serviceDate: Date): Promise<SqlTripRow[]> {
		const gtfsRouteIds = await this.resolveRouteIds(routeId);

		if (gtfsRouteIds.length === 0) {
			return [];
		}

		const { sql, params } = inClause(gtfsRouteIds);
		const trips = await query<SqlTripRow>(
			`SELECT trip_id, route_id, service_id FROM gtfs_trips WHERE route_id IN (${sql})`,
			params
		);

		if (trips.length === 0) {
			return [];
		}

		const serviceIds = [...new Set(trips.map((trip) => trip.service_id))];
		const calendars = await this.loadCalendars(serviceIds);
		const exceptions = await this.loadExceptions(serviceIds, serviceDate);
		const active: SqlTripRow[] = [];

		for (const trip of trips) {
			if (
				isCalendarServiceActive(
					exceptions.get(calendarDateKey(trip.service_id, toGtfsDate(serviceDate))),
					calendars.get(trip.service_id),
					serviceDate
				)
			) {
				active.push(trip);
			}
		}

		return active;
	}

	private async resolveRouteIds(candidateRouteId: string): Promise<string[]> {
		const cacheKey = candidateRouteId.trim();
		const cached = this.routeIdsByCandidate.get(cacheKey);

		if (cached) {
			return cached;
		}

		const pending = this.loadRouteIds(candidateRouteId).catch((cause) => {
			this.routeIdsByCandidate.delete(cacheKey);
			throw cause;
		});
		this.routeIdsByCandidate.set(cacheKey, pending);
		return pending;
	}

	private async loadRouteIds(candidateRouteId: string): Promise<string[]> {
		const shortName = extractRouteShortName(candidateRouteId);

		if (shortName) {
			const lookupNames = [...new Set(routeShortNameKeys(shortName))];
			const { sql, params } = inClause(lookupNames);
			const rows = await query<SqlRouteRow>(
				`SELECT route_id, route_short_name FROM gtfs_routes WHERE route_short_name IN (${sql})`,
				params
			);
			const matched = rows
				.filter((row) => {
					const gtfsShortName = extractRouteShortName(row.route_short_name ?? '');
					return gtfsShortName.length > 0 && routeShortNameKeys(gtfsShortName).includes(shortName);
				})
				.map((row) => row.route_id);

			if (matched.length > 0) {
				return [...new Set(matched)];
			}
		}

		const byId = await queryOne<{ route_id: string }>(
			'SELECT route_id FROM gtfs_trips WHERE route_id = $1 LIMIT 1',
			[candidateRouteId]
		);

		return byId ? [candidateRouteId] : [];
	}

	private loadCalendars(serviceIds: string[]): Promise<Map<string, GtfsCalendarWindow>> {
		const cacheKey = serviceSetKey(serviceIds);
		const cached = this.calendarsByServiceSet.get(cacheKey);

		if (cached) {
			return cached;
		}

		const pending = loadCalendars(serviceIds).catch((cause) => {
			this.calendarsByServiceSet.delete(cacheKey);
			throw cause;
		});
		this.calendarsByServiceSet.set(cacheKey, pending);
		return pending;
	}

	private loadExceptions(serviceIds: string[], serviceDate: Date): Promise<Map<string, string>> {
		const cacheKey = `${toGtfsDate(serviceDate)}:${serviceSetKey(serviceIds)}`;
		const cached = this.exceptionsByServiceSetAndDate.get(cacheKey);

		if (cached) {
			return cached;
		}

		const pending = loadExceptions(serviceIds, serviceDate).catch((cause) => {
			this.exceptionsByServiceSetAndDate.delete(cacheKey);
			throw cause;
		});
		this.exceptionsByServiceSetAndDate.set(cacheKey, pending);
		return pending;
	}

	private async ensureStopTimes(tripIds: string[], stopIds: string[]): Promise<void> {
		const uniqueTripIds = [...new Set(tripIds)];
		const uniqueStopIds = [...new Set(stopIds)];

		if (uniqueTripIds.length === 0 || uniqueStopIds.length === 0) {
			return;
		}

		const missing = uniqueTripIds.filter(
			(tripId) => !this.stopTimesByTripAndStops.has(stopTimesKey(tripId, uniqueStopIds))
		);

		if (missing.length === 0) {
			return;
		}

		for (const tripId of missing) {
			this.stopTimesByTripAndStops.set(stopTimesKey(tripId, uniqueStopIds), []);
		}

		for (let offset = 0; offset < missing.length; offset += TRIP_ID_IN_CHUNK) {
			const tripChunk = missing.slice(offset, offset + TRIP_ID_IN_CHUNK);
			const tripClause = inClause(tripChunk);
			const stopClause = inClause(uniqueStopIds, tripClause.params.length);
			const rows = await query<SqlStopTimeRow>(
				`SELECT trip_id, stop_id, stop_sequence, arrival_time, departure_time
				 FROM gtfs_stop_times
				 WHERE trip_id IN (${tripClause.sql}) AND stop_id IN (${stopClause.sql})
				 ORDER BY trip_id, stop_sequence`,
				[...tripClause.params, ...stopClause.params]
			);

			for (const row of rows) {
				const departureSeconds = parseGtfsClockToSeconds(
					row.departure_time || row.arrival_time || ''
				);
				const arrivalSeconds = parseGtfsClockToSeconds(row.arrival_time || row.departure_time || '');

				if (departureSeconds === null || arrivalSeconds === null) {
					continue;
				}

				const key = stopTimesKey(row.trip_id, uniqueStopIds);
				const points = this.stopTimesByTripAndStops.get(key) ?? [];
				points.push({
					stopId: row.stop_id,
					sequence: Number(row.stop_sequence),
					arrivalSeconds,
					departureSeconds
				});
				this.stopTimesByTripAndStops.set(key, points);
			}
		}
	}
}

async function loadCalendars(serviceIds: string[]): Promise<Map<string, GtfsCalendarWindow>> {
	const { sql, params } = inClause(serviceIds);
	const rows = await query<SqlCalendarRow>(
		`SELECT service_id, start_date, end_date, sunday, monday, tuesday, wednesday, thursday, friday, saturday
		 FROM gtfs_calendar WHERE service_id IN (${sql})`,
		params
	);
	const calendars = new Map<string, GtfsCalendarWindow>();

	for (const row of rows) {
		calendars.set(row.service_id, {
			startDate: row.start_date,
			endDate: row.end_date,
			days: GTFS_CALENDAR_DAY_COLUMNS.map((column) => row[column])
		});
	}

	return calendars;
}

async function loadExceptions(
	serviceIds: string[],
	serviceDate: Date
): Promise<Map<string, string>> {
	const ymd = toGtfsDate(serviceDate);
	const { sql, params } = inClause(serviceIds);
	const rows = await query<SqlExceptionRow>(
		`SELECT service_id, date, exception_type
		 FROM gtfs_calendar_dates
		 WHERE date = $${params.length + 1} AND service_id IN (${sql})`,
		[...params, ymd]
	);
	const exceptions = new Map<string, string>();

	for (const row of rows) {
		exceptions.set(calendarDateKey(row.service_id, row.date), row.exception_type);
	}

	return exceptions;
}

function inClause(values: string[], paramOffset = 0): { sql: string; params: string[] } {
	return {
		sql: values.map((_, index) => `$${paramOffset + index + 1}`).join(', '),
		params: values
	};
}

function stopTimesKey(tripId: string, stopIds: string[]): string {
	return `${tripId}|${[...stopIds].sort().join(',')}`;
}

function uniqueStopNameLookups(stopName: string): string[] {
	const trimmed = stopName.trim();
	const compacted = trimmed.replace(/\s+/g, '');
	const normalized = normalizeStopName(trimmed);
	const withStation = normalized ? `${normalized}역` : '';

	return [...new Set([trimmed, compacted, normalized, withStation].filter((value) => value !== ''))];
}

function serviceSetKey(serviceIds: string[]): string {
	return [...new Set(serviceIds)].sort().join('|');
}

function secondsSinceServiceStart(at: Date, serviceDate: Date): number {
	return (at.getTime() - startOfLocalDay(serviceDate).getTime()) / 1000;
}

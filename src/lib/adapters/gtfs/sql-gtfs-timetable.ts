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

export class SqlGtfsTimetable implements TimetablePort {
	private routesPromise: Promise<Map<string, string[]>> | null = null;
	private stopsPromise: Promise<SqlStopRow[]> | null = null;
	private readonly stopTimesByTrip = new Map<string, StopTimePoint[]>();

	async prepare(routeIds: string[], serviceDate: Date): Promise<void> {
		const trips: SqlTripRow[] = [];

		for (const routeId of routeIds) {
			trips.push(...(await this.activeTripsForRoute(routeId, serviceDate)));
		}

		await this.ensureStopTimes(trips.map((trip) => trip.trip_id));
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
		await this.ensureStopTimes(activeTrips.map((trip) => trip.trip_id));

		const afterSeconds = secondsSinceServiceStart(query.after, query.serviceDate);
		let best: { trip: SqlTripRow; boardSeconds: number; alightSeconds: number } | null = null;

		for (const trip of activeTrips) {
			const points = this.stopTimesByTrip.get(trip.trip_id);

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
		const stops = await this.ensureStops();
		const trimmed = stopName.trim();
		const exact = stops.filter((stop) => stop.stop_name === trimmed);

		if (exact.length > 0) {
			return exact;
		}

		const normalized = normalizeStopName(trimmed);
		const byNormalized = stops.filter((stop) => normalizeStopName(stop.stop_name) === normalized);

		if (byNormalized.length > 0) {
			return byNormalized;
		}

		return stops.filter((stop) => isStopNameMatch(trimmed, stop.stop_name));
	}

	private ensureStops(): Promise<SqlStopRow[]> {
		if (!this.stopsPromise) {
			this.stopsPromise = query<SqlStopRow>(
				'SELECT stop_id, stop_name, stop_lat, stop_lon FROM gtfs_stops'
			).catch((cause) => {
				this.stopsPromise = null;
				throw cause;
			});
		}

		return this.stopsPromise;
	}

	private async routeIdsByShortName(): Promise<Map<string, string[]>> {
		if (!this.routesPromise) {
			this.routesPromise = query<SqlRouteRow>('SELECT route_id, route_short_name FROM gtfs_routes')
				.then((rows) => {
					const map = new Map<string, string[]>();

					for (const row of rows) {
						const shortName = extractRouteShortName(row.route_short_name ?? '');

						if (!shortName) {
							continue;
						}

						for (const key of routeShortNameKeys(shortName)) {
							const ids = map.get(key) ?? [];
							ids.push(row.route_id);
							map.set(key, ids);
						}
					}

					return map;
				})
				.catch((cause) => {
					this.routesPromise = null;
					throw cause;
				});
		}

		return this.routesPromise;
	}

	private async activeTripsForRoute(routeId: string, serviceDate: Date): Promise<SqlTripRow[]> {
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
		const calendars = await loadCalendars(serviceIds);
		const exceptions = await loadExceptions(serviceIds, serviceDate);
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
		const shortName = extractRouteShortName(candidateRouteId);
		const byShortName = await this.routeIdsByShortName();

		if (shortName) {
			const matched = byShortName.get(shortName);

			if (matched && matched.length > 0) {
				return [...new Set(matched)];
			}
		}

		const byId = await queryOne<{ route_id: string }>(
			'SELECT route_id FROM gtfs_trips WHERE route_id = $1 LIMIT 1',
			[candidateRouteId]
		);

		return byId ? [candidateRouteId] : [];
	}

	private async ensureStopTimes(tripIds: string[]): Promise<void> {
		const missing = [...new Set(tripIds)].filter((tripId) => !this.stopTimesByTrip.has(tripId));

		if (missing.length === 0) {
			return;
		}

		const { sql, params } = inClause(missing);
		const rows = await query<SqlStopTimeRow>(
			`SELECT trip_id, stop_id, stop_sequence, arrival_time, departure_time
			 FROM gtfs_stop_times
			 WHERE trip_id IN (${sql})
			 ORDER BY trip_id, stop_sequence`,
			params
		);

		for (const tripId of missing) {
			this.stopTimesByTrip.set(tripId, []);
		}

		for (const row of rows) {
			const departureSeconds = parseGtfsClockToSeconds(
				row.departure_time || row.arrival_time || ''
			);
			const arrivalSeconds = parseGtfsClockToSeconds(row.arrival_time || row.departure_time || '');

			if (departureSeconds === null || arrivalSeconds === null) {
				continue;
			}

			const points = this.stopTimesByTrip.get(row.trip_id) ?? [];
			points.push({
				stopId: row.stop_id,
				sequence: Number(row.stop_sequence),
				arrivalSeconds,
				departureSeconds
			});
			this.stopTimesByTrip.set(row.trip_id, points);
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

function inClause(values: string[]): { sql: string; params: string[] } {
	return {
		sql: values.map((_, index) => `$${index + 1}`).join(', '),
		params: values
	};
}

function secondsSinceServiceStart(at: Date, serviceDate: Date): number {
	return (at.getTime() - startOfLocalDay(serviceDate).getTime()) / 1000;
}

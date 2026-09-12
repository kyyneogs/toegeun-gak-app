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
	routeShortNamesOverlap,
	uniqueStopNameLookups
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

const STOP_NAME_CANDIDATE_LIMIT = 200;

let sqlQueryInvocations = 0;

export function sqlGtfsQueryInvocations(): number {
	return sqlQueryInvocations;
}

export function resetSqlGtfsQueryInvocations(): void {
	sqlQueryInvocations = 0;
}

async function countedQuery<T extends Record<string, unknown>>(
	text: string,
	params: unknown[] = []
): Promise<T[]> {
	sqlQueryInvocations += 1;
	return query<T>(text, params);
}

async function countedQueryOne<T extends Record<string, unknown>>(
	text: string,
	params: unknown[] = []
): Promise<T | null> {
	sqlQueryInvocations += 1;
	return queryOne<T>(text, params);
}

type CorridorStopTimeRow = SqlTripRow & SqlStopTimeRow;

type PreparedTrip = {
	trip: SqlTripRow;
	points: StopTimePoint[];
};

type PreparedCorridor = {
	ymd: string;
	routeIds: Set<string>;
	trips: PreparedTrip[];
	stops: SqlStopRow[];
};

export class SqlGtfsTimetable implements TimetablePort {
	readonly source = 'sql' as const;
	private readonly routeIdsByCandidate = new Map<string, Promise<string[]>>();
	private readonly stopMatchesByName = new Map<string, Promise<SqlStopRow[]>>();
	private routesPromise: Promise<SqlRouteRow[]> | null = null;
	private prepared: PreparedCorridor | null = null;
	private prepareLock: Promise<void> | null = null;

	async prepare(routeIds: string[], serviceDate: Date): Promise<void> {
		const gtfsRouteIds = [
			...new Set(
				(await Promise.all(routeIds.map((routeId) => this.resolveRouteIds(routeId)))).flat()
			)
		];
		await this.ensurePrepared(gtfsRouteIds, serviceDate);
	}

	async findStopCoordinates(stopName: string): Promise<GeoPoint[]> {
		const fromPrepared = this.matchPreparedStops(stopName);
		const source = fromPrepared.length > 0 ? fromPrepared : await this.matchStops(stopName);
		const points: GeoPoint[] = [];

		for (const stop of source) {
			if (stop.stop_lat != null && stop.stop_lon != null) {
				points.push({ latitude: Number(stop.stop_lat), longitude: Number(stop.stop_lon) });
			}
		}

		return points;
	}

	async findNextTrip(query: NextTripQuery): Promise<TripChoice | null> {
		const gtfsRouteIds = await this.resolveRouteIds(query.routeId);

		if (gtfsRouteIds.length === 0) {
			return null;
		}

		await this.ensurePrepared(gtfsRouteIds, query.serviceDate);
		return this.pickPreparedTrip(query, gtfsRouteIds);
	}

	private async ensurePrepared(gtfsRouteIds: string[], serviceDate: Date): Promise<void> {
		if (this.prepareLock) {
			await this.prepareLock;
		}

		const needed = gtfsRouteIds.filter((routeId) => !this.isRoutePrepared(routeId, serviceDate));

		if (needed.length === 0) {
			return;
		}

		const pending = this.loadPreparedRoutes(needed, serviceDate).finally(() => {
			this.prepareLock = null;
		});
		this.prepareLock = pending;
		await pending;
	}

	private isRoutePrepared(routeId: string, serviceDate: Date): boolean {
		return this.prepared?.ymd === toGtfsDate(serviceDate) && this.prepared.routeIds.has(routeId);
	}

	private async loadPreparedRoutes(gtfsRouteIds: string[], serviceDate: Date): Promise<void> {
		if (gtfsRouteIds.length === 0) {
			return;
		}

		const ymd = toGtfsDate(serviceDate);
		const rows = await loadStopTimesForRoutes(gtfsRouteIds);

		if (rows.length === 0) {
			this.mergePrepared(ymd, gtfsRouteIds, [], []);
			return;
		}

		const serviceIds = [...new Set(rows.map((row) => row.service_id))];
		const [calendars, exceptions] = await Promise.all([
			loadCalendars(serviceIds),
			loadExceptions(serviceIds, serviceDate)
		]);
		const trips = groupActiveTrips(rows, calendars, exceptions, serviceDate);
		const stopIds = [...new Set(trips.flatMap((trip) => trip.points.map((point) => point.stopId)))];
		const stops = stopIds.length > 0 ? await loadStopsByIds(stopIds) : [];
		this.mergePrepared(ymd, gtfsRouteIds, trips, stops);
	}

	private mergePrepared(
		ymd: string,
		routeIds: string[],
		trips: PreparedTrip[],
		stops: SqlStopRow[]
	): void {
		if (!this.prepared || this.prepared.ymd !== ymd) {
			this.prepared = {
				ymd,
				routeIds: new Set(routeIds),
				trips,
				stops
			};
			return;
		}

		for (const routeId of routeIds) {
			this.prepared.routeIds.add(routeId);
		}

		this.prepared.trips.push(...trips);
		const seenStops = new Set(this.prepared.stops.map((stop) => stop.stop_id));

		for (const stop of stops) {
			if (!seenStops.has(stop.stop_id)) {
				seenStops.add(stop.stop_id);
				this.prepared.stops.push(stop);
			}
		}
	}

	private matchPreparedStops(stopName: string): SqlStopRow[] {
		if (!this.prepared) {
			return [];
		}

		return this.prepared.stops.filter((stop) => isStopNameMatch(stopName, stop.stop_name));
	}

	private pickPreparedTrip(query: NextTripQuery, gtfsRouteIds: string[]): TripChoice | null {
		if (!this.prepared || this.prepared.ymd !== toGtfsDate(query.serviceDate)) {
			return null;
		}

		const routeIdSet = new Set(gtfsRouteIds);
		const boardStops = new Set(
			this.prepared.stops
				.filter((stop) => isStopNameMatch(query.boardStopName, stop.stop_name))
				.map((stop) => stop.stop_id)
		);
		const alightStops = new Set(
			this.prepared.stops
				.filter((stop) => isStopNameMatch(query.alightStopName, stop.stop_name))
				.map((stop) => stop.stop_id)
		);

		if (boardStops.size === 0 || alightStops.size === 0) {
			return null;
		}

		const afterSeconds = secondsSinceServiceStart(query.after, query.serviceDate);
		let best: { trip: SqlTripRow; boardSeconds: number; alightSeconds: number } | null = null;

		for (const prepared of this.prepared.trips) {
			if (!routeIdSet.has(prepared.trip.route_id)) {
				continue;
			}

			const next = nextBoardAndAlight(prepared.points, boardStops, alightStops, afterSeconds);

			if (!next) {
				continue;
			}

			if (!best || next.boardSeconds < best.boardSeconds) {
				best = {
					trip: prepared.trip,
					boardSeconds: next.boardSeconds,
					alightSeconds: next.alightSeconds
				};
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
		const exactRows = await countedQuery<SqlStopRow>(
			`SELECT stop_id, stop_name, stop_lat, stop_lon FROM gtfs_stops WHERE stop_name IN (${exactClause.sql})`,
			exactClause.params
		);
		const named = exactRows.filter((stop) => isStopNameMatch(trimmed, stop.stop_name));

		if (named.length > 0) {
			return named;
		}

		const normalized = normalizeStopName(trimmed);
		const prefixes = [...new Set([trimmed, normalized].filter((value) => value.length > 0))];
		const likeClause = prefixes.map((_, index) => `stop_name LIKE $${index + 1}`).join(' OR ');
		const prefixRows = await countedQuery<SqlStopRow>(
			`SELECT stop_id, stop_name, stop_lat, stop_lon
			 FROM gtfs_stops
			 WHERE ${likeClause}
			 ORDER BY char_length(stop_name)
			 LIMIT ${STOP_NAME_CANDIDATE_LIMIT}`,
			prefixes.map((value) => `${value}%`)
		);

		return prefixRows.filter((stop) => isStopNameMatch(trimmed, stop.stop_name));
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
			const rows = await this.loadRoutes();
			const matched = rows
				.filter((row) => routeShortNamesOverlap(shortName, row.route_short_name ?? ''))
				.map((row) => row.route_id);

			if (matched.length > 0) {
				return [...new Set(matched)];
			}
		}

		const byId = await countedQueryOne<{ route_id: string }>(
			'SELECT route_id FROM gtfs_trips WHERE route_id = $1 LIMIT 1',
			[candidateRouteId]
		);

		return byId ? [candidateRouteId] : [];
	}

	private loadRoutes(): Promise<SqlRouteRow[]> {
		if (!this.routesPromise) {
			this.routesPromise = countedQuery<SqlRouteRow>(
				'SELECT route_id, route_short_name FROM gtfs_routes'
			).catch((cause) => {
				this.routesPromise = null;
				throw cause;
			});
		}

		return this.routesPromise;
	}
}

function groupActiveTrips(
	rows: CorridorStopTimeRow[],
	calendars: Map<string, GtfsCalendarWindow>,
	exceptions: Map<string, string>,
	serviceDate: Date
): PreparedTrip[] {
	const pointsByTrip = new Map<string, StopTimePoint[]>();
	const tripById = new Map<string, SqlTripRow>();
	const ymd = toGtfsDate(serviceDate);

	for (const row of rows) {
		if (
			!isCalendarServiceActive(
				exceptions.get(calendarDateKey(row.service_id, ymd)),
				calendars.get(row.service_id),
				serviceDate
			)
		) {
			continue;
		}

		tripById.set(row.trip_id, {
			trip_id: row.trip_id,
			route_id: row.route_id,
			service_id: row.service_id
		});

		const departureSeconds = parseGtfsClockToSeconds(row.departure_time || row.arrival_time || '');
		const arrivalSeconds = parseGtfsClockToSeconds(row.arrival_time || row.departure_time || '');

		if (departureSeconds === null || arrivalSeconds === null) {
			continue;
		}

		const points = pointsByTrip.get(row.trip_id) ?? [];
		points.push({
			stopId: row.stop_id,
			sequence: Number(row.stop_sequence),
			arrivalSeconds,
			departureSeconds
		});
		pointsByTrip.set(row.trip_id, points);
	}

	const trips: PreparedTrip[] = [];

	for (const trip of tripById.values()) {
		const points = pointsByTrip.get(trip.trip_id);

		if (points && points.length > 0) {
			trips.push({ trip, points });
		}
	}

	return trips;
}

async function loadStopTimesForRoutes(routeIds: string[]): Promise<CorridorStopTimeRow[]> {
	const routeClause = inClause(routeIds);
	return countedQuery<CorridorStopTimeRow>(
		`SELECT t.trip_id, t.route_id, t.service_id,
		        st.stop_id, st.stop_sequence, st.arrival_time, st.departure_time
		 FROM gtfs_trips t
		 JOIN gtfs_stop_times st ON st.trip_id = t.trip_id
		 WHERE t.route_id IN (${routeClause.sql})
		 ORDER BY t.trip_id, st.stop_sequence`,
		routeClause.params
	);
}

async function loadStopsByIds(stopIds: string[]): Promise<SqlStopRow[]> {
	const { sql, params } = inClause(stopIds);
	return countedQuery<SqlStopRow>(
		`SELECT stop_id, stop_name, stop_lat, stop_lon FROM gtfs_stops WHERE stop_id IN (${sql})`,
		params
	);
}

async function loadCalendars(serviceIds: string[]): Promise<Map<string, GtfsCalendarWindow>> {
	const { sql, params } = inClause(serviceIds);
	const rows = await countedQuery<SqlCalendarRow>(
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
	const rows = await countedQuery<SqlExceptionRow>(
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

function secondsSinceServiceStart(at: Date, serviceDate: Date): number {
	return (at.getTime() - startOfLocalDay(serviceDate).getTime()) / 1000;
}

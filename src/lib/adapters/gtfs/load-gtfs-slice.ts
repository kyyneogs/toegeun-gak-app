import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import postgres from 'postgres';
import { forEachCsvRow } from '$lib/adapters/gtfs/gtfs-csv-reader';
import { GTFS_REQUIRED_FILES } from '$lib/adapters/gtfs/gtfs-timetable';
import { query } from '$lib/server/db';

const INSERT_BATCH_SIZE = 200;

const TABLE_COLUMNS: Record<string, readonly string[]> = {
	gtfs_routes: ['route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_type'],
	gtfs_stops: ['stop_id', 'stop_name', 'stop_lat', 'stop_lon'],
	gtfs_calendar: [
		'service_id',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
		'sunday',
		'start_date',
		'end_date'
	],
	gtfs_calendar_dates: ['service_id', 'date', 'exception_type'],
	gtfs_trips: ['route_id', 'service_id', 'trip_id'],
	gtfs_stop_times: [
		'trip_id',
		'arrival_time',
		'departure_time',
		'stop_id',
		'stop_sequence',
		'pickup_type',
		'drop_off_type',
		'timepoint'
	]
};

const COPY_ORDER: { file: string; table: string; required: boolean }[] = [
	{ file: 'routes.txt', table: 'gtfs_routes', required: true },
	{ file: 'stops.txt', table: 'gtfs_stops', required: true },
	{ file: 'calendar.txt', table: 'gtfs_calendar', required: true },
	{ file: 'calendar_dates.txt', table: 'gtfs_calendar_dates', required: false },
	{ file: 'trips.txt', table: 'gtfs_trips', required: true },
	{ file: 'stop_times.txt', table: 'gtfs_stop_times', required: true }
];

export async function loadGtfsSliceFromDirectory(
	directory: string
): Promise<{ routes: number; trips: number; stopTimes: number }> {
	assertRequiredFiles(directory);

	const databaseUrl = process.env.DATABASE_URL?.trim();
	const inTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

	if (databaseUrl && !inTest) {
		await loadWithCopy(directory, databaseUrl);
	} else {
		await loadWithInserts(directory);
	}

	const routes = await countRows('gtfs_routes');
	const trips = await countRows('gtfs_trips');
	const stopTimes = await countRows('gtfs_stop_times');

	console.info('GTFS CSV loaded', { directory, routes, trips, stopTimes });
	return { routes, trips, stopTimes };
}

function assertRequiredFiles(directory: string): void {
	const missing = GTFS_REQUIRED_FILES.filter((fileName) => !existsSync(join(directory, fileName)));

	if (missing.length > 0) {
		throw new Error(`GTFS_DIR is missing required files: ${missing.join(', ')}`);
	}
}

async function countRows(table: string): Promise<number> {
	const row = await query<{ count: string | number }>(`SELECT count(*)::int AS count FROM ${table}`);
	return Number(row[0]?.count ?? 0);
}

async function loadWithCopy(directory: string, databaseUrl: string): Promise<void> {
	const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: 'require' });

	try {
		await sql.unsafe(
			'TRUNCATE gtfs_stop_times, gtfs_trips, gtfs_calendar_dates, gtfs_calendar, gtfs_stops, gtfs_routes'
		);

		for (const target of COPY_ORDER) {
			const filePath = join(directory, target.file);

			if (!existsSync(filePath)) {
				if (target.required) {
					throw new Error(`Missing ${target.file}`);
				}
				continue;
			}

			const columns = await csvHeadersInTable(filePath, TABLE_COLUMNS[target.table] ?? []);

			if (columns.length === 0) {
				throw new Error(`${target.file} has no columns that match ${target.table}`);
			}

			const columnSql = columns.map((column) => quoteIdent(column)).join(', ');
			const writable = await sql.unsafe(
				`COPY ${target.table} (${columnSql}) FROM STDIN WITH (FORMAT csv, HEADER true)`
			).writable();
			await pipeline(createReadStream(filePath), writable);
			console.info('GTFS CSV copied', { file: target.file, columns });
		}
	} finally {
		await sql.end({ timeout: 5 });
	}
}

async function loadWithInserts(directory: string): Promise<void> {
	await query('DELETE FROM gtfs_stop_times');
	await query('DELETE FROM gtfs_trips');
	await query('DELETE FROM gtfs_calendar_dates');
	await query('DELETE FROM gtfs_calendar');
	await query('DELETE FROM gtfs_stops');
	await query('DELETE FROM gtfs_routes');

	for (const target of COPY_ORDER) {
		const filePath = join(directory, target.file);

		if (!existsSync(filePath)) {
			if (target.required) {
				throw new Error(`Missing ${target.file}`);
			}
			continue;
		}

		const columns = await csvHeadersInTable(filePath, TABLE_COLUMNS[target.table] ?? []);
		const rows: Record<string, string>[] = [];

		await forEachCsvRow(filePath, (row) => {
			rows.push(row);
		});

		for (const batch of chunk(rows, INSERT_BATCH_SIZE)) {
			if (batch.length === 0 || columns.length === 0) {
				continue;
			}

			const values: unknown[] = [];
			const placeholders = batch.map((row, rowIndex) => {
				const cells = columns.map((column, columnIndex) => {
					values.push(row[column] ?? null);
					return `$${rowIndex * columns.length + columnIndex + 1}`;
				});
				return `(${cells.join(', ')})`;
			});

			await query(
				`INSERT INTO ${target.table} (${columns.map(quoteIdent).join(', ')}) VALUES ${placeholders.join(', ')}`,
				values
			);
		}
	}
}

async function csvHeadersInTable(filePath: string, tableColumns: readonly string[]): Promise<string[]> {
	const headerLine = await readFirstLine(filePath);
	const allowed = new Set(tableColumns);
	return headerLine
		.replace(/^\uFEFF/, '')
		.split(',')
		.map((header) => header.trim())
		.filter((header) => allowed.has(header));
}

async function readFirstLine(filePath: string): Promise<string> {
	const stream = createReadStream(filePath, { encoding: 'utf8' });
	const lines = createInterface({ input: stream, crlfDelay: Infinity });

	try {
		for await (const line of lines) {
			if (line.trim().length > 0) {
				return line;
			}
		}
	} finally {
		lines.close();
		stream.destroy();
	}

	return '';
}

function quoteIdent(name: string): string {
	return `"${name.replaceAll('"', '""')}"`;
}

function chunk<T>(items: T[], size: number): T[][] {
	if (items.length === 0) {
		return [];
	}

	const batches: T[][] = [];

	for (let index = 0; index < items.length; index += size) {
		batches.push(items.slice(index, index + size));
	}

	return batches;
}

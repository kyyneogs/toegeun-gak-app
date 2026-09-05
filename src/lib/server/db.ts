import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import { APP_SCHEMA_SQL } from '$lib/server/schema';

type QueryRow = Record<string, unknown>;

interface DatabaseClient {
	query<T extends QueryRow>(text: string, params?: unknown[]): Promise<T[]>;
	exec(sql: string): Promise<void>;
}

let clientPromise: Promise<DatabaseClient> | null = null;

export async function query<T extends QueryRow>(
	text: string,
	params: unknown[] = []
): Promise<T[]> {
	const client = await getClient();
	return client.query<T>(text, params);
}

export async function queryOne<T extends QueryRow>(
	text: string,
	params: unknown[] = []
): Promise<T | null> {
	const rows = await query<T>(text, params);
	return rows[0] ?? null;
}

export async function resetDatabaseForTests(): Promise<void> {
	await query('DELETE FROM standup_jobs');
	await query('DELETE FROM push_subscriptions');
	await query('DELETE FROM commits');
	await query('DELETE FROM recommendation_snapshots');
	await query('DELETE FROM sessions');
	await query('DELETE FROM users');
	await query('DELETE FROM gtfs_stop_times');
	await query('DELETE FROM gtfs_trips');
	await query('DELETE FROM gtfs_calendar_dates');
	await query('DELETE FROM gtfs_calendar');
	await query('DELETE FROM gtfs_stops');
	await query('DELETE FROM gtfs_routes');
}

export function isUniqueViolation(cause: unknown): boolean {
	if (!cause || typeof cause !== 'object') {
		return false;
	}

	const record = cause as { code?: string; message?: string };
	return record.code === '23505' || Boolean(record.message?.toLowerCase().includes('unique'));
}

async function getClient(): Promise<DatabaseClient> {
	if (!clientPromise) {
		clientPromise = createClient();
	}

	return clientPromise;
}

async function createClient(): Promise<DatabaseClient> {
	const inTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
	const databaseUrl = inTest ? undefined : process.env.DATABASE_URL?.trim();

	if (process.env.VERCEL && !databaseUrl) {
		throw new Error('DATABASE_URL is required on Vercel');
	}

	if (databaseUrl) {
		const sql = postgres(databaseUrl, { max: 4, prepare: false, ssl: 'require' });
		const client: DatabaseClient = {
			async query<T extends QueryRow>(text: string, params: unknown[] = []): Promise<T[]> {
				const rows = await sql.unsafe(text, params as never[]);
				return [...rows] as unknown as T[];
			},
			async exec(sqlText: string): Promise<void> {
				await sql.unsafe(sqlText);
			}
		};

		if (!process.env.VERCEL) {
			await applySchema(client);
		}

		return client;
	}

	const dataDir =
		process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'
			? undefined
			: join(process.cwd(), '.data', 'pglite');
	const pglite = new PGlite(dataDir);
	await pglite.waitReady;
	const client: DatabaseClient = {
		async query<T extends QueryRow>(text: string, params: unknown[] = []): Promise<T[]> {
			const result = await pglite.query<T>(text, params);
			return result.rows;
		},
		async exec(sqlText: string): Promise<void> {
			await pglite.exec(sqlText);
		}
	};
	await client.exec(APP_SCHEMA_SQL);
	return client;
}

async function applySchema(client: DatabaseClient): Promise<void> {
	const statements = APP_SCHEMA_SQL.split(';')
		.map((statement) => statement.trim())
		.filter((statement) => statement.length > 0);

	for (const statement of statements) {
		await client.exec(`${statement};`);
	}
}

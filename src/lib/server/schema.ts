import { DEFAULT_STANDUP_LEAD_MINUTES } from '$lib/constants/persist';

// 로컬 PGlite·DATABASE_URL(비-Vercel) 기동 시 적용. Vercel은 배포 전 sql/schema.sql 을 적용합니다.
// PGlite에는 auth.users가 없어 users.id UUID에 FK를 걸지 않습니다.
export const APP_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY,
	email TEXT UNIQUE,
	auth_provider TEXT NOT NULL DEFAULT 'email',
	nickname TEXT NOT NULL,
	ranking_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
	standup_lead_minutes INTEGER NOT NULL DEFAULT ${DEFAULT_STANDUP_LEAD_MINUTES},
	created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendation_snapshots (
	id TEXT PRIMARY KEY,
	payload JSONB NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS commits (
	id TEXT PRIMARY KEY,
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	recommendation_id TEXT NOT NULL,
	service_date TEXT NOT NULL,
	committed_at TIMESTAMPTZ NOT NULL,
	origin_name TEXT NOT NULL,
	destination_name TEXT NOT NULL,
	departure_at TIMESTAMPTZ NOT NULL,
	arrival_at TIMESTAMPTZ NOT NULL,
	naive_arrival_at TIMESTAMPTZ NOT NULL,
	saved_seconds INTEGER NOT NULL,
	criterion TEXT NOT NULL,
	UNIQUE (user_id, recommendation_id)
);

CREATE INDEX IF NOT EXISTS commits_committed_at_idx ON commits (committed_at);
CREATE INDEX IF NOT EXISTS commits_user_committed_idx ON commits (user_id, committed_at);
CREATE INDEX IF NOT EXISTS commits_user_service_date_idx ON commits (user_id, service_date);

CREATE TABLE IF NOT EXISTS push_subscriptions (
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	endpoint TEXT NOT NULL,
	p256dh TEXT NOT NULL,
	auth TEXT NOT NULL,
	PRIMARY KEY (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS standup_jobs (
	id TEXT PRIMARY KEY,
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	fire_at TIMESTAMPTZ NOT NULL,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS standup_jobs_due_idx ON standup_jobs (fire_at);

CREATE TABLE IF NOT EXISTS gtfs_routes (
	route_id TEXT PRIMARY KEY,
	agency_id TEXT,
	route_short_name TEXT NOT NULL,
	route_long_name TEXT,
	route_type TEXT
);

CREATE INDEX IF NOT EXISTS gtfs_routes_short_name_idx ON gtfs_routes (route_short_name);

CREATE TABLE IF NOT EXISTS gtfs_stops (
	stop_id TEXT PRIMARY KEY,
	stop_name TEXT NOT NULL,
	stop_lat DOUBLE PRECISION,
	stop_lon DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS gtfs_stops_name_idx ON gtfs_stops (stop_name);

CREATE TABLE IF NOT EXISTS gtfs_calendar (
	service_id TEXT PRIMARY KEY,
	monday TEXT NOT NULL,
	tuesday TEXT NOT NULL,
	wednesday TEXT NOT NULL,
	thursday TEXT NOT NULL,
	friday TEXT NOT NULL,
	saturday TEXT NOT NULL,
	sunday TEXT NOT NULL,
	start_date TEXT NOT NULL,
	end_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gtfs_calendar_dates (
	service_id TEXT NOT NULL,
	date TEXT NOT NULL,
	exception_type TEXT NOT NULL,
	PRIMARY KEY (service_id, date)
);

CREATE TABLE IF NOT EXISTS gtfs_trips (
	trip_id TEXT PRIMARY KEY,
	route_id TEXT NOT NULL REFERENCES gtfs_routes (route_id) ON DELETE CASCADE,
	service_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS gtfs_trips_route_idx ON gtfs_trips (route_id);

-- pickup_type, drop_off_type, timepoint는 CSV에 있으나 조회에 안 쓰고 행 수가 커서 생략
CREATE TABLE IF NOT EXISTS gtfs_stop_times (
	trip_id TEXT NOT NULL REFERENCES gtfs_trips (trip_id) ON DELETE CASCADE,
	arrival_time TEXT NOT NULL,
	departure_time TEXT NOT NULL,
	stop_id TEXT NOT NULL,
	stop_sequence INTEGER NOT NULL,
	PRIMARY KEY (trip_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS gtfs_stop_times_stop_id_idx ON gtfs_stop_times (stop_id);
`.trim();

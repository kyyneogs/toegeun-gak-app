import { EmptyTimetable, tryCreateGtfsTimetable } from '$lib/adapters/gtfs/gtfs-timetable';
import { hasSqlGtfsSlice, SqlGtfsTimetable } from '$lib/adapters/gtfs/sql-gtfs-timetable';
import { KakaoScheduledRouteProvider } from '$lib/adapters/kakao/kakao-scheduled-route-provider';
import { createKakaoTransitClient } from '$lib/adapters/kakao/kakao-transit-client';
import type { TimetablePort } from '$lib/ports/timetable-port';

let cachedKey: string | null = null;
let cachedGtfsDir: string | null = null;
let cachedProvider: KakaoScheduledRouteProvider | null = null;

export function getServerKakaoRouteProvider(
	restKey: string,
	gtfsDir = ''
): KakaoScheduledRouteProvider {
	if (cachedProvider && cachedKey === restKey && cachedGtfsDir === gtfsDir) {
		return cachedProvider;
	}

	cachedKey = restKey;
	cachedGtfsDir = gtfsDir;
	cachedProvider = new KakaoScheduledRouteProvider(
		createKakaoTransitClient(restKey),
		new SelectingTimetable(gtfsDir)
	);

	return cachedProvider;
}

class SelectingTimetable implements TimetablePort {
	private inner: TimetablePort | null = null;
	private resolvePromise: Promise<TimetablePort> | null = null;

	constructor(private readonly gtfsDir: string) {}

	async prepare(routeIds: string[], serviceDate: Date): Promise<void> {
		const timetable = await this.resolve();
		await timetable.prepare?.(routeIds, serviceDate);
	}

	async findNextTrip(query: Parameters<TimetablePort['findNextTrip']>[0]) {
		return (await this.resolve()).findNextTrip(query);
	}

	async findStopCoordinates(stopName: string) {
		const timetable = await this.resolve();
		return timetable.findStopCoordinates?.(stopName) ?? [];
	}

	private async resolve(): Promise<TimetablePort> {
		if (this.inner) {
			return this.inner;
		}

		if (!this.resolvePromise) {
			this.resolvePromise = this.createTimetable().catch((cause) => {
				this.resolvePromise = null;
				throw cause;
			});
		}

		return this.resolvePromise;
	}

	private async createTimetable(): Promise<TimetablePort> {
		if (await hasSqlGtfsSlice()) {
			console.info('GTFS timetable: SQL corridor slice');
			this.inner = new SqlGtfsTimetable();
			return this.inner;
		}

		const fileTimetable = tryCreateGtfsTimetable(this.gtfsDir);

		if (fileTimetable) {
			console.info('GTFS timetable: local CSV', { directory: this.gtfsDir });
			this.inner = fileTimetable;
			return this.inner;
		}

		console.error('GTFS timetable is not configured; scheduled routes will be unavailable', {
			gtfsDir: this.gtfsDir
		});
		this.inner = new EmptyTimetable();
		return this.inner;
	}
}

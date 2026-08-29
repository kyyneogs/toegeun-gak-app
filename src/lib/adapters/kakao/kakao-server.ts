import { EmptyTimetable, tryCreateGtfsTimetable } from '$lib/adapters/gtfs/gtfs-timetable';
import { KakaoScheduledRouteProvider } from '$lib/adapters/kakao/kakao-scheduled-route-provider';
import { createKakaoTransitClient } from '$lib/adapters/kakao/kakao-transit-client';

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

	const timetable = tryCreateGtfsTimetable(gtfsDir);

	if (!timetable) {
		console.error('GTFS timetable is not configured; scheduled routes will be unavailable', {
			gtfsDir
		});
	}

	cachedKey = restKey;
	cachedGtfsDir = gtfsDir;
	cachedProvider = new KakaoScheduledRouteProvider(
		createKakaoTransitClient(restKey),
		timetable ?? new EmptyTimetable()
	);

	return cachedProvider;
}

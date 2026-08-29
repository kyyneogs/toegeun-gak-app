import { EstimatedTimetable } from '$lib/adapters/gtfs/estimated-timetable';
import { FallbackTimetable } from '$lib/adapters/gtfs/fallback-timetable';
import { tryCreateGtfsTimetable } from '$lib/adapters/gtfs/gtfs-timetable';
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

	cachedKey = restKey;
	cachedGtfsDir = gtfsDir;
	cachedProvider = new KakaoScheduledRouteProvider(
		createKakaoTransitClient(restKey),
		new FallbackTimetable(tryCreateGtfsTimetable(gtfsDir), new EstimatedTimetable())
	);

	return cachedProvider;
}

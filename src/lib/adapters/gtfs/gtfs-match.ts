export function extractRouteShortName(routeName: string): string {
	const trimmed = routeName.trim();
	const afterColon = trimmed.includes(':') ? trimmed.slice(trimmed.lastIndexOf(':') + 1) : trimmed;

	return afterColon
		.replace(/^서울\s*/u, '')
		.replace(/^수도권\s*/u, '')
		.replace(/^지하철\s*/u, '')
		.replace(/번$/u, '')
		.replace(/\s+/g, '');
}

export function routeShortNamesOverlap(kakaoRouteName: string, gtfsRouteName: string): boolean {
	const kakao = extractRouteShortName(kakaoRouteName);
	const gtfs = extractRouteShortName(gtfsRouteName);

	if (!kakao || !gtfs) {
		return false;
	}

	const kakaoKeys = new Set(routeShortNameKeys(kakao));
	return routeShortNameKeys(gtfs).some((key) => kakaoKeys.has(key));
}

const BUS_LETTER_VARIANT = /^(\d+)[A-Za-z]$/;

export function routeShortNameKeys(shortName: string): string[] {
	const keys = [shortName];

	if (shortName.endsWith('선') && shortName.length > 1) {
		keys.push(shortName.slice(0, -1));
	}

	const busVariant = BUS_LETTER_VARIANT.exec(shortName);

	if (busVariant?.[1]) {
		keys.push(busVariant[1]);
	}

	return [...new Set(keys)];
}

export function normalizeStopName(stopName: string): string {
	return stopName
		.replace(/\([^)]*\)/g, '')
		.replace(/\s+/g, '')
		.replace(/역$/u, '');
}

export function uniqueStopNameLookups(stopName: string): string[] {
	const trimmed = stopName.trim();
	const compacted = trimmed.replace(/\s+/g, '');
	const normalized = normalizeStopName(trimmed);
	const withStation = normalized ? `${normalized}역` : '';

	return [
		...new Set([trimmed, compacted, normalized, withStation].filter((value) => value !== ''))
	];
}

export function isStopNameMatch(kakaoName: string, gtfsName: string): boolean {
	const kakao = kakaoName.trim();
	const gtfs = gtfsName.trim();

	if (!kakao || !gtfs) {
		return false;
	}

	if (kakao === gtfs) {
		return true;
	}

	const kakaoNormalized = normalizeStopName(kakao);
	const gtfsNormalized = normalizeStopName(gtfs);

	if (kakaoNormalized.length > 0 && kakaoNormalized === gtfsNormalized) {
		return true;
	}

	if (gtfs.startsWith(kakao) || kakao.startsWith(gtfs)) {
		return true;
	}

	return kakaoNormalized.length >= 2 && gtfsNormalized.endsWith(kakaoNormalized);
}

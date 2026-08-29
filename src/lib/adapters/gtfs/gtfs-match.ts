export function extractRouteShortName(routeName: string): string {
	const trimmed = routeName.trim();
	const afterColon = trimmed.includes(':') ? trimmed.slice(trimmed.lastIndexOf(':') + 1) : trimmed;

	return afterColon
		.replace(/^서울\s*/u, '')
		.replace(/번$/u, '')
		.replace(/\s+/g, '');
}

export function normalizeStopName(stopName: string): string {
	return stopName
		.replace(/\([^)]*\)/g, '')
		.replace(/\s+/g, '')
		.replace(/역$/u, '');
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

	if (kakaoNormalized.length < 2 || gtfsNormalized.length < 2) {
		return false;
	}

	return (
		gtfsNormalized.startsWith(kakaoNormalized) ||
		kakaoNormalized.startsWith(gtfsNormalized) ||
		gtfsNormalized.endsWith(kakaoNormalized)
	);
}

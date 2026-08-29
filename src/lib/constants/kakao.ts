import type { ScheduleSource } from '$lib/domain/route/timetable';

export const KAKAO_MAPS_SDK_BASE_URL = 'https://dapi.kakao.com/v2/maps/sdk.js';
export const KAKAO_MAPS_SDK_LIBRARIES = 'services';
export const KAKAO_PUBLICTRAFFIC_URL = 'https://dapi.kakao.com/v2/routing/publictraffic';
export const PLACE_CONNECTION_PROBE_QUERY = '강남역';

export const KAKAO_ROUTE_PROBE_ORIGIN = {
	name: '강남역',
	latitude: 37.497952,
	longitude: 127.027619
};

export const KAKAO_ROUTE_PROBE_DESTINATION = {
	name: '역삼역',
	latitude: 37.500622,
	longitude: 127.036456
};

export const KAKAO_CONNECTION_FAILURE_MESSAGE =
	'Kakao 장소 검색에 연결하지 못했습니다. 앱 > 플랫폼 키 > JavaScript 키 > JavaScript SDK 도메인에 http://호스트:포트를 등록하세요. 링크 연동 허용과는 다른 설정입니다. 카카오맵 사용 설정도 ON이어야 합니다.';

export const KAKAO_ROUTE_MOCK_CONNECTION_MESSAGE =
	'Kakao REST 키가 없어 Mock 경로를 사용 중입니다. 실제 버스·지하철 시각표가 아닙니다.';

export const KAKAO_ROUTE_KEY_CONFIGURED_MESSAGE =
	'Kakao 대중교통 경로가 설정되어 있습니다. 실제 경로 검색은 설정에서 다시 확인하세요.';

export const KAKAO_ROUTE_CONNECTED_MESSAGE =
	'Kakao 대중교통 경로에 연결되었습니다. 퇴근각은 GTFS 정적 시각표입니다.';

export const KAKAO_ROUTE_FAILURE_MESSAGE =
	'Kakao 대중교통 경로에 연결하지 못했습니다. REST API 키와 카카오맵 사용 설정을 확인하세요.';

export const KAKAO_ROUTE_NETWORK_FAILURE_MESSAGE =
	'Kakao 서버에 연결하지 못했습니다. 네트워크를 확인하세요.';

export const KAKAO_GTFS_ROUTE_COPY = 'GTFS 정적 시각표입니다. 실시간 도착이 아닙니다.';

export function scheduleRouteCopy(source: ScheduleSource | undefined): string {
	void source;
	return KAKAO_GTFS_ROUTE_COPY;
}

export function isKakaoRestKeyConfigured(key: string | undefined): boolean {
	return Boolean(key?.trim());
}

export function buildKakaoMapsSdkUrl(appKey: string): string {
	const params = new URLSearchParams({
		appkey: appKey,
		libraries: KAKAO_MAPS_SDK_LIBRARIES,
		autoload: 'false'
	});

	return `${KAKAO_MAPS_SDK_BASE_URL}?${params.toString()}`;
}

export function isKakaoJsKeyConfigured(key: string | undefined): boolean {
	return Boolean(key?.trim());
}

export const ERROR_CODES = {
	INVALID_REQUEST: 'INVALID_REQUEST',
	INVALID_PLACE: 'INVALID_PLACE',
	PLACE_SEARCH_FAILED: 'PLACE_SEARCH_FAILED',
	ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
	ROUTE_PROVIDER_TIMEOUT: 'ROUTE_PROVIDER_TIMEOUT',
	ROUTE_PROVIDER_RATE_LIMIT: 'ROUTE_PROVIDER_RATE_LIMIT',
	RECOMMENDATION_UNAVAILABLE: 'RECOMMENDATION_UNAVAILABLE',
	NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_USER_MESSAGES: Record<ErrorCode, string> = {
	INVALID_REQUEST: '입력값을 다시 확인해주세요.',
	INVALID_PLACE: '출발지 또는 목적지를 선택해주세요.',
	PLACE_SEARCH_FAILED: '장소를 찾지 못했습니다. 잠시 후 다시 시도해주세요.',
	ROUTE_NOT_FOUND: '해당 시간대에 이용 가능한 경로를 찾지 못했습니다.',
	ROUTE_PROVIDER_TIMEOUT: '교통정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
	ROUTE_PROVIDER_RATE_LIMIT: '교통정보 요청이 많아 잠시 후 다시 시도해주세요.',
	RECOMMENDATION_UNAVAILABLE: '조건에 맞는 퇴근각을 찾지 못했습니다.',
	NETWORK_ERROR: '네트워크 연결을 확인한 뒤 다시 시도해주세요.'
};

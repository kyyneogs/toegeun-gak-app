export const ERROR_CODES = {
	INVALID_REQUEST: 'INVALID_REQUEST',
	INVALID_PLACE: 'INVALID_PLACE',
	PLACE_SEARCH_FAILED: 'PLACE_SEARCH_FAILED',
	ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
	ROUTE_PROVIDER_TIMEOUT: 'ROUTE_PROVIDER_TIMEOUT',
	ROUTE_PROVIDER_RATE_LIMIT: 'ROUTE_PROVIDER_RATE_LIMIT',
	RECOMMENDATION_UNAVAILABLE: 'RECOMMENDATION_UNAVAILABLE',
	NETWORK_ERROR: 'NETWORK_ERROR',
	AUTH_REQUIRED: 'AUTH_REQUIRED',
	AUTH_INVALID: 'AUTH_INVALID',
	AUTH_CONFLICT: 'AUTH_CONFLICT'
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_USER_MESSAGES: Record<ErrorCode, string> = {
	INVALID_REQUEST: '입력값을 다시 확인해 주세요.',
	INVALID_PLACE: '출발지나 목적지를 골라 주세요.',
	PLACE_SEARCH_FAILED: '장소를 찾지 못했어요. 잠시 후 다시 볼게요.',
	ROUTE_NOT_FOUND: '이 시간에는 탈 수 있는 길이 없어요. 시간을 바꿔 볼게요.',
	ROUTE_PROVIDER_TIMEOUT: '교통 정보를 가져오지 못했어요. 잠시 후 다시 볼게요.',
	ROUTE_PROVIDER_RATE_LIMIT: '요청이 많아서 잠시 후 다시 볼게요.',
	RECOMMENDATION_UNAVAILABLE: '이 시각까지 도착하는 길을 찾지 못했어요. 시간을 바꿔 볼게요.',
	NETWORK_ERROR: '네트워크 연결을 확인한 뒤 다시 볼게요.',
	AUTH_REQUIRED: '로그인이 필요해요.',
	AUTH_INVALID: '이메일이나 비밀번호를 다시 확인해 주세요.',
	AUTH_CONFLICT: '이미 가입된 이메일이에요.'
};

export const ERROR_DEPARTURE_WINDOW = '끝나는 시간이 시작 시간보다 빨라요.';
export const ERROR_DESIRED_ARRIVAL = '도착하고 싶은 시간은 출발할 수 있는 시간 이후여야 해요.';

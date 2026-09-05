import {
	ERROR_DEPARTURE_WINDOW,
	ERROR_DESIRED_ARRIVAL,
	ERROR_USER_MESSAGES
} from '$lib/constants/errors';
import { describe, expect, it } from 'vitest';

describe('ERROR_USER_MESSAGES', () => {
	it('uses 해요체 and points to a next action', () => {
		expect(ERROR_USER_MESSAGES.ROUTE_NOT_FOUND).toBe(
			'이 시간에는 탈 수 있는 길이 없어요. 시간을 바꿔 볼게요.'
		);
		expect(ERROR_USER_MESSAGES.PLACE_SEARCH_FAILED).toBe(
			'장소를 찾지 못했어요. 잠시 후 다시 볼게요.'
		);
		expect(ERROR_DEPARTURE_WINDOW).toBe('끝나는 시간이 시작 시간보다 빨라요.');
		expect(ERROR_DESIRED_ARRIVAL).toBe('도착하고 싶은 시간은 출발할 수 있는 시간 이후여야 해요.');
	});
});

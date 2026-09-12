import {
	encodeRecommendStreamEvent,
	errorFromRecommendStream,
	parseRecommendStreamEvent
} from '$lib/adapters/http/recommend-stream';
import { ERROR_CODES } from '$lib/constants/errors';
import { describe, expect, it } from 'vitest';

describe('recommend stream', () => {
	it('round-trips progress and result lines', () => {
		const progress = parseRecommendStreamEvent(
			encodeRecommendStreamEvent({ type: 'progress', stage: 'searchingRoutes' }).trim()
		);
		expect(progress).toEqual({ type: 'progress', stage: 'searchingRoutes' });
	});

	it('does not treat aiPicking as a server recommend stage', () => {
		expect(parseRecommendStreamEvent('{"type":"progress","stage":"aiPicking"}')).toBeNull();
	});

	it('maps in-stream errors without a 10 second combined budget', () => {
		const error = errorFromRecommendStream({
			type: 'error',
			code: ERROR_CODES.ROUTE_NOT_FOUND,
			message: '이 시간에는 탈 수 있는 길이 없어요. 시간을 바꿔 볼게요.'
		});
		expect(error.code).toBe(ERROR_CODES.ROUTE_NOT_FOUND);
	});
});

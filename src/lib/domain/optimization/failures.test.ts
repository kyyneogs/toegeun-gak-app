import { formatRouteFailures } from '$lib/domain/optimization/failures';
import { ERROR_USER_MESSAGES } from '$lib/constants/errors';
import { describe, expect, it } from 'vitest';

describe('formatRouteFailures', () => {
	it('lists each failed segment', () => {
		const message = formatRouteFailures([
			{
				routeIndex: 0,
				segmentIndex: 1,
				stopName: '판교역',
				candidateRouteIds: ['5001', '5002'],
				reason: 'NO_TRIP_AFTER'
			}
		]);

		expect(message).toContain(ERROR_USER_MESSAGES.ROUTE_NOT_FOUND);
		expect(message).toContain('경로 1');
		expect(message).toContain('판교역');
		expect(message).toContain('5001, 5002');
	});
});

import { parseRecommendRequest } from '$lib/adapters/http/recommend-request';
import { describe, expect, it } from 'vitest';

describe('parseRecommendRequest', () => {
	it('reads origin, destination, leave-after, and optional arrive-by', () => {
		const parsed = parseRecommendRequest({
			origin: { name: '회사', latitude: 37.3, longitude: 127.1 },
			destination: { name: '집', latitude: 37.5, longitude: 127.0 },
			departureFrom: '2026-08-29T09:00:00.000Z',
			desiredArrivalAt: '2026-08-29T12:00:00.000Z',
			criterion: 'leastWalking'
		});

		expect(parsed?.origin.name).toBe('회사');
		expect(parsed?.criterion).toBe('leastWalking');
		expect(parsed?.desiredArrivalAt).toBe('2026-08-29T12:00:00.000Z');
	});

	it('rejects incomplete bodies', () => {
		expect(parseRecommendRequest({ origin: { name: '회사' } })).toBeNull();
	});
});

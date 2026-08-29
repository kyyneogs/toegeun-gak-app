import { parseTransitRequest } from '$lib/adapters/http/transit-request';
import { describe, expect, it } from 'vitest';

describe('parseTransitRequest', () => {
	it('accepts a valid JSON body', () => {
		const request = parseTransitRequest({
			origin: { name: '강남역', latitude: 37.49, longitude: 127.02 },
			destination: { name: '역삼역', latitude: 37.5, longitude: 127.03 },
			departureAt: '2026-08-29T09:10:00.000Z'
		});

		expect(request?.origin.name).toBe('강남역');
		expect(request?.departureAt.toISOString()).toBe('2026-08-29T09:10:00.000Z');
	});

	it('rejects incomplete bodies', () => {
		expect(parseTransitRequest({})).toBeNull();
		expect(
			parseTransitRequest({
				origin: { name: '강남역', latitude: 37.49, longitude: 127.02 },
				destination: { name: '역삼역', latitude: 37.5, longitude: 127.03 },
				departureAt: 'not-a-date'
			})
		).toBeNull();
	});
});

import { COMPANY_PLACE, GANGNAM_STATION } from '$lib/adapters/mock/mock-places';
import { PlaceConnectionChecker } from '$lib/application/place/place-connection-checker';
import type { Place } from '$lib/domain/place/place';
import type { PlaceService } from '$lib/ports/place-service';
import { describe, expect, it } from 'vitest';

class StubPlaceService implements PlaceService {
	constructor(
		private readonly places: Place[],
		private readonly failure?: Error
	) {}

	async search(): Promise<Place[]> {
		if (this.failure) {
			throw this.failure;
		}

		return this.places;
	}
}

describe('PlaceConnectionChecker', () => {
	it('reports mock mode when Kakao is not configured', async () => {
		const checker = new PlaceConnectionChecker('mock', new StubPlaceService([GANGNAM_STATION]));
		const result = await checker.check();

		expect(result.ok).toBe(true);
		expect(result.backend).toBe('mock');
		expect(result.samplePlaceName).toBe(GANGNAM_STATION.name);
		expect(result.message).toContain('Mock');
	});

	it('reports Kakao success with a sample place name', async () => {
		const checker = new PlaceConnectionChecker('kakao', new StubPlaceService([COMPANY_PLACE]));
		const result = await checker.check();

		expect(result.ok).toBe(true);
		expect(result.backend).toBe('kakao');
		expect(result.samplePlaceName).toBe(COMPANY_PLACE.name);
		expect(result.message).toContain('연결');
	});

	it('treats Kakao empty search as connected', async () => {
		const checker = new PlaceConnectionChecker('kakao', new StubPlaceService([]));
		const result = await checker.check();

		expect(result.ok).toBe(true);
		expect(result.backend).toBe('kakao');
		expect(result.message).toContain('검색 결과가 없습니다');
	});

	it('reports Kakao failure without exposing internals', async () => {
		const checker = new PlaceConnectionChecker(
			'kakao',
			new StubPlaceService([], new Error('secret boom'))
		);
		const result = await checker.check();

		expect(result.ok).toBe(false);
		expect(result.backend).toBe('kakao');
		expect(result.message).toContain('JavaScript SDK 도메인');
		expect(result.message).not.toContain('secret');
	});
});

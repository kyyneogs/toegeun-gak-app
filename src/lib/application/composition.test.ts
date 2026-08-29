import { MockPlaceProvider } from '$lib/adapters/mock/mock-place-provider';
import {
	createAppServices,
	getSharedLiveRouteProvider,
	resetAppServices
} from '$lib/application/composition';
import { afterEach, describe, expect, it } from 'vitest';

describe('createAppServices place provider', () => {
	afterEach(() => {
		resetAppServices();
	});

	it('uses mock search when the mock provider is selected', async () => {
		const services = createAppServices({
			placeProvider: new MockPlaceProvider(),
			placeBackendKind: 'mock'
		});
		const places = await services.placeService.search('강남');

		expect(places.some((place) => place.name.includes('강남'))).toBe(true);
		expect(places[0]?.provider).toBe('mock');
	});

	it('reports mock connection status without calling Kakao', async () => {
		const services = createAppServices({
			placeProvider: new MockPlaceProvider(),
			placeBackendKind: 'mock'
		});
		const result = await services.placeConnection.check();

		expect(result.ok).toBe(true);
		expect(result.backend).toBe('mock');
	});

	it('reports mock route connection when Kakao REST is not configured', async () => {
		const services = createAppServices({
			placeProvider: new MockPlaceProvider(),
			placeBackendKind: 'mock'
		});
		const result = await services.routeConnection.check();

		expect(result.ok).toBe(true);
		expect(result.backend).toBe('mock');
	});
});

describe('shared live route provider', () => {
	afterEach(() => {
		resetAppServices();
	});

	it('reuses one cached provider instance', () => {
		expect(getSharedLiveRouteProvider()).toBe(getSharedLiveRouteProvider());
	});
});

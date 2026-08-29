import { AdaptiveRouteProvider } from '$lib/adapters/http/adaptive-route-provider';
import { MemoryCachedRouteProvider } from '$lib/adapters/http/cached-route-provider';
import { fetchTransitStatus, HttpRouteProvider } from '$lib/adapters/http/http-route-provider';
import { KakaoPlaceProvider } from '$lib/adapters/kakao/kakao-place-provider';
import { MockPlaceProvider } from '$lib/adapters/mock/mock-place-provider';
import { MockRouteProvider } from '$lib/adapters/mock/mock-route-provider';
import { BrowserStorageAdapter } from '$lib/adapters/storage/browser-storage-adapter';
import { MemoryStorageAdapter } from '$lib/adapters/storage/memory-storage-adapter';
import { PlaceConnectionChecker } from '$lib/application/place/place-connection-checker';
import { PlaceApplicationService } from '$lib/application/place/place-service';
import { RecommendationApplicationService } from '$lib/application/recommendation/recommendation-service';
import { RouteConnectionChecker } from '$lib/application/route/route-connection-checker';
import { RuleBasedExplanationService } from '$lib/application/explanation/rule-based-explanation-service';
import { TripApplicationService } from '$lib/application/trip/trip-service';
import { isKakaoJsKeyConfigured } from '$lib/constants/kakao';
import type { PlaceBackendKind, PlaceConnectionService } from '$lib/ports/place-connection';
import type { ExplanationService } from '$lib/ports/explanation-service';
import type { PlaceService } from '$lib/ports/place-service';
import type { RecommendationService } from '$lib/ports/recommendation-service';
import type { RouteConnectionService } from '$lib/ports/route-connection';
import type { RouteProvider } from '$lib/ports/route-provider';
import type { StoragePort } from '$lib/ports/storage-port';
import type { TripService } from '$lib/ports/trip-service';
import { env } from '$env/dynamic/public';

export interface AppServices {
	placeService: PlaceService;
	placeConnection: PlaceConnectionService;
	routeConnection: RouteConnectionService;
	tripService: TripService;
	recommendationService: RecommendationService;
	explanationService: ExplanationService;
	storage: StoragePort;
}

export interface AppServiceOverrides {
	placeProvider?: PlaceService;
	placeBackendKind?: PlaceBackendKind;
	routeProvider?: RouteProvider;
	routeConnection?: RouteConnectionService;
	storage?: StoragePort;
	explanationService?: ExplanationService;
}

export function createAppServices(overrides: AppServiceOverrides = {}): AppServices {
	const backendKind = overrides.placeBackendKind ?? resolvePlaceBackendKind();
	const placeProvider = overrides.placeProvider ?? createPlaceProvider(backendKind);
	const placeService = new PlaceApplicationService(placeProvider);
	const routeProvider = overrides.routeProvider ?? createDefaultRouteProvider();
	const storage = overrides.storage ?? createDefaultStorage();

	return {
		placeService,
		placeConnection: new PlaceConnectionChecker(backendKind, placeService),
		routeConnection: overrides.routeConnection ?? createDefaultRouteConnection(),
		tripService: new TripApplicationService(),
		recommendationService: new RecommendationApplicationService(routeProvider),
		explanationService: overrides.explanationService ?? new RuleBasedExplanationService(),
		storage
	};
}

let singleton: AppServices | null = null;
let sharedLiveRouteProvider: RouteProvider | null = null;

export function getAppServices(): AppServices {
	if (!singleton) {
		singleton = createAppServices();
	}

	return singleton;
}

export function resetAppServices(): void {
	singleton = null;
	sharedLiveRouteProvider = null;
}

export function getSharedLiveRouteProvider(): RouteProvider {
	if (!sharedLiveRouteProvider) {
		sharedLiveRouteProvider = new MemoryCachedRouteProvider(new HttpRouteProvider());
	}

	return sharedLiveRouteProvider;
}

function resolvePlaceBackendKind(): PlaceBackendKind {
	return isKakaoJsKeyConfigured(env.PUBLIC_KAKAO_JS_KEY) ? 'kakao' : 'mock';
}

function createPlaceProvider(backendKind: PlaceBackendKind): PlaceService {
	if (backendKind === 'kakao') {
		return new KakaoPlaceProvider(env.PUBLIC_KAKAO_JS_KEY?.trim() ?? '');
	}

	return new MockPlaceProvider();
}

function createDefaultRouteProvider(): RouteProvider {
	if (typeof window === 'undefined') {
		return new MockRouteProvider();
	}

	return new AdaptiveRouteProvider(
		getSharedLiveRouteProvider(),
		new MockRouteProvider(),
		fetchTransitStatus
	);
}

function createDefaultRouteConnection(): RouteConnectionService {
	if (typeof window === 'undefined') {
		return new RouteConnectionChecker(async () => ({ configured: false }), new MockRouteProvider());
	}

	return new RouteConnectionChecker(fetchTransitStatus, getSharedLiveRouteProvider());
}

function createDefaultStorage(): StoragePort {
	if (typeof window === 'undefined') {
		return new MemoryStorageAdapter();
	}

	return new BrowserStorageAdapter();
}

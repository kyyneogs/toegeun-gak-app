import type { KakaoPlaceDocument } from '$lib/adapters/kakao/kakao-place-document';
import { buildKakaoMapsSdkUrl } from '$lib/constants/kakao';

export interface KakaoPlacesClient {
	keywordSearch(query: string): Promise<KakaoPlaceDocument[]>;
}

let sdkLoadPromise: Promise<void> | null = null;

export function createKakaoPlacesSdkClient(appKey: string): KakaoPlacesClient {
	return {
		async keywordSearch(query: string): Promise<KakaoPlaceDocument[]> {
			await loadKakaoPlacesSdk(appKey);
			return searchWithLoadedSdk(query);
		}
	};
}

export function loadKakaoPlacesSdk(appKey: string): Promise<void> {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('Kakao Places SDK requires a browser'));
	}

	if (window.kakao?.maps?.services) {
		return Promise.resolve();
	}

	if (sdkLoadPromise) {
		return sdkLoadPromise;
	}

	sdkLoadPromise = new Promise<void>((resolve, reject) => {
		const script = document.createElement('script');
		script.src = buildKakaoMapsSdkUrl(appKey);
		script.async = true;
		script.onload = () => {
			if (!window.kakao?.maps?.load) {
				sdkLoadPromise = null;
				reject(new Error('Kakao Maps SDK loaded without maps.load'));
				return;
			}

			window.kakao.maps.load(() => {
				if (!window.kakao?.maps?.services) {
					sdkLoadPromise = null;
					reject(new Error('Kakao Maps SDK loaded without services library'));
					return;
				}

				resolve();
			});
		};
		script.onerror = () => {
			sdkLoadPromise = null;
			reject(new Error('Failed to load Kakao Maps SDK'));
		};
		document.head.appendChild(script);
	});

	return sdkLoadPromise;
}

function searchWithLoadedSdk(query: string): Promise<KakaoPlaceDocument[]> {
	return new Promise((resolve, reject) => {
		const services = window.kakao?.maps?.services;

		if (!services) {
			reject(new Error('Kakao Places service is unavailable'));
			return;
		}

		const places = new services.Places();
		places.keywordSearch(query, (data, status) => {
			if (status === services.Status.OK) {
				resolve(data);
				return;
			}

			if (status === services.Status.ZERO_RESULT) {
				resolve([]);
				return;
			}

			reject(new Error(`Kakao place search failed: ${status}`));
		});
	});
}

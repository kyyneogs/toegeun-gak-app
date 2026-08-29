import type { KakaoTransitResponse } from '$lib/adapters/kakao/kakao-transit-document';
import { ERROR_CODES } from '$lib/constants/errors';
import { KAKAO_PUBLICTRAFFIC_URL } from '$lib/constants/kakao';
import { AppError } from '$lib/domain/errors';
import { isNetworkFailure } from '$lib/utils/network';

export interface KakaoTransitSearchPoint {
	latitude: number;
	longitude: number;
}

export interface KakaoTransitClient {
	search(
		origin: KakaoTransitSearchPoint,
		destination: KakaoTransitSearchPoint
	): Promise<KakaoTransitResponse>;
}

export function createKakaoTransitClient(
	restKey: string,
	fetchImpl: typeof fetch = fetch
): KakaoTransitClient {
	return {
		async search(origin, destination): Promise<KakaoTransitResponse> {
			const url = new URL(KAKAO_PUBLICTRAFFIC_URL);
			url.searchParams.set('start_x', String(origin.longitude));
			url.searchParams.set('start_y', String(origin.latitude));
			url.searchParams.set('end_x', String(destination.longitude));
			url.searchParams.set('end_y', String(destination.latitude));

			let response: Response;

			try {
				response = await fetchImpl(url, {
					method: 'GET',
					headers: {
						Accept: 'application/json',
						Authorization: `KakaoAK ${restKey}`
					}
				});
			} catch (cause) {
				if (isNetworkFailure(cause)) {
					throw new AppError(ERROR_CODES.NETWORK_ERROR, undefined, cause);
				}

				throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT, undefined, cause);
			}

			if (!response.ok) {
				console.error('Kakao transit HTTP status', response.status);
				throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT);
			}

			try {
				return (await response.json()) as KakaoTransitResponse;
			} catch (cause) {
				throw new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT, undefined, cause);
			}
		}
	};
}

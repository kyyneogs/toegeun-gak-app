import {
	KAKAO_ROUTE_CONNECTED_MESSAGE,
	KAKAO_ROUTE_FAILURE_MESSAGE,
	KAKAO_ROUTE_KEY_CONFIGURED_MESSAGE,
	KAKAO_ROUTE_MOCK_CONNECTION_MESSAGE,
	KAKAO_ROUTE_NETWORK_FAILURE_MESSAGE,
	KAKAO_ROUTE_PROBE_DESTINATION,
	KAKAO_ROUTE_PROBE_ORIGIN
} from '$lib/constants/kakao';
import type { TransitConfiguredStatus } from '$lib/ports/route-connection';
import { ERROR_CODES } from '$lib/constants/errors';
import { isAppError } from '$lib/domain/errors';
import type {
	RouteConnectionCheckOptions,
	RouteConnectionResult,
	RouteConnectionService
} from '$lib/ports/route-connection';
import type { RouteProvider } from '$lib/ports/route-provider';
import { isNetworkFailure } from '$lib/utils/network';

export class RouteConnectionChecker implements RouteConnectionService {
	constructor(
		private readonly readStatus: () => Promise<TransitConfiguredStatus>,
		private readonly live: RouteProvider
	) {}

	async check(options: RouteConnectionCheckOptions = {}): Promise<RouteConnectionResult> {
		try {
			const status = await this.readStatus();

			if (!status.configured) {
				return {
					backend: 'mock',
					ok: true,
					verified: true,
					message: KAKAO_ROUTE_MOCK_CONNECTION_MESSAGE
				};
			}
		} catch (cause) {
			console.error('Route connection status check failed', cause);
			return {
				backend: 'kakao',
				ok: false,
				verified: false,
				message: KAKAO_ROUTE_FAILURE_MESSAGE
			};
		}

		if (!options.probe) {
			return {
				backend: 'kakao',
				ok: true,
				verified: false,
				message: KAKAO_ROUTE_KEY_CONFIGURED_MESSAGE
			};
		}

		return this.probeKakao();
	}

	private async probeKakao(): Promise<RouteConnectionResult> {
		try {
			const routes = await this.loadProbeRoutes();

			if (routes.length === 0) {
				return {
					backend: 'kakao',
					ok: true,
					verified: true,
					message: `${KAKAO_ROUTE_CONNECTED_MESSAGE} 프로브 경로 결과는 비어 있습니다.`
				};
			}

			const sampleRouteName = routes[0].sections.find((section) => section.routeName)?.routeName;

			return {
				backend: 'kakao',
				ok: true,
				verified: true,
				message: KAKAO_ROUTE_CONNECTED_MESSAGE,
				sampleRouteName
			};
		} catch (cause) {
			console.error('Kakao route connection check failed', cause);
			return {
				backend: 'kakao',
				ok: false,
				verified: true,
				message: connectionFailureMessage(cause)
			};
		}
	}

	private async loadProbeRoutes() {
		if (this.live.findLiveRoute) {
			const liveRoute = await this.live.findLiveRoute({
				origin: KAKAO_ROUTE_PROBE_ORIGIN,
				destination: KAKAO_ROUTE_PROBE_DESTINATION
			});

			if (liveRoute) {
				return [liveRoute];
			}
		}

		return this.live.findRoutes({
			origin: KAKAO_ROUTE_PROBE_ORIGIN,
			destination: KAKAO_ROUTE_PROBE_DESTINATION,
			departureAt: new Date()
		});
	}
}

function connectionFailureMessage(cause: unknown): string {
	if (isNetworkFailure(cause) || (isAppError(cause) && cause.code === ERROR_CODES.NETWORK_ERROR)) {
		return KAKAO_ROUTE_NETWORK_FAILURE_MESSAGE;
	}

	return KAKAO_ROUTE_FAILURE_MESSAGE;
}

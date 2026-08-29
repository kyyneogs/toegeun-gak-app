import type { KakaoTransitClient } from '$lib/adapters/kakao/kakao-transit-client';
import {
	mapKakaoRouteToTemplate,
	pickKakaoTransitRoute
} from '$lib/adapters/kakao/kakao-transit-mapper';
import { firstTransitLeg, materializeRouteTemplate } from '$lib/domain/route/schedule';
import type { RouteRequest, TransitRoute } from '$lib/domain/route/route';
import type { RouteTemplate } from '$lib/domain/route/template';
import type { RouteProvider } from '$lib/ports/route-provider';
import type { TimetablePort } from '$lib/ports/timetable-port';
import { placePairKey } from '$lib/utils/geo';
import { formatClock } from '$lib/utils/time';

interface CachedTopology {
	template: RouteTemplate;
	liveRoute: TransitRoute;
}

export class KakaoScheduledRouteProvider implements RouteProvider {
	private readonly topologies = new Map<string, Promise<CachedTopology | null>>();

	constructor(
		private readonly client: KakaoTransitClient,
		private readonly timetable: TimetablePort
	) {}

	async findLiveRoute(
		request: Pick<RouteRequest, 'origin' | 'destination'>
	): Promise<TransitRoute | null> {
		const topology = await this.loadTopology(request);
		return topology?.liveRoute ?? null;
	}

	async findRoutes(request: RouteRequest): Promise<TransitRoute[]> {
		const topology = await this.loadTopology(request);

		if (!topology) {
			return [];
		}

		const firstTransit = firstTransitLeg(topology.template);
		const route = await materializeRouteTemplate(topology.template, {
			provider: 'schedule',
			routeId: `schedule_${formatClock(request.departureAt)}`,
			leaveAt: request.departureAt,
			applyHeadwayWait: true,
			resolveFirstDeparture: (arriveAtStop) =>
				this.timetable.nextDeparture({
					routeName: firstTransit?.routeName ?? firstTransit?.routeId ?? '',
					stopName: firstTransit?.startPlaceName ?? '',
					after: arriveAtStop
				})
		});

		return route ? [route] : [];
	}

	private loadTopology(
		request: Pick<RouteRequest, 'origin' | 'destination'>
	): Promise<CachedTopology | null> {
		const key = placePairKey(request.origin, request.destination);
		const existing = this.topologies.get(key);

		if (existing) {
			return existing;
		}

		const pending = this.fetchTopology(request).catch((cause) => {
			this.topologies.delete(key);
			throw cause;
		});

		this.topologies.set(key, pending);
		return pending;
	}

	private async fetchTopology(
		request: Pick<RouteRequest, 'origin' | 'destination'>
	): Promise<CachedTopology | null> {
		const payload = await this.client.search(request.origin, request.destination);
		const kakaoRoute = pickKakaoTransitRoute(payload);

		if (!kakaoRoute) {
			return null;
		}

		const template = mapKakaoRouteToTemplate(
			kakaoRoute,
			request.origin.name,
			request.destination.name
		);

		if (!template) {
			return null;
		}

		const liveAt = new Date();
		const liveRoute = await materializeRouteTemplate(template, {
			provider: 'kakao',
			routeId: `kakao_live_${liveAt.toISOString()}`,
			leaveAt: liveAt,
			applyHeadwayWait: false
		});

		if (!liveRoute) {
			return null;
		}

		return { template, liveRoute };
	}
}

import type { KakaoTransitClient } from '$lib/adapters/kakao/kakao-transit-client';
import {
	mapKakaoRouteToLiveTemplate,
	mapKakaoRoutesToTopologies
} from '$lib/adapters/kakao/kakao-transit-mapper';
import { ERROR_CODES } from '$lib/constants/errors';
import { ROUTE_SEARCH_TIMEOUT_MS, ROUTE_TIMING_TIMEOUT_MS } from '$lib/constants/persist';
import {
	firstTransitSegment,
	lastTransitSegment,
	withAccessWalks
} from '$lib/domain/optimization/access-walk';
import { formatRouteFailures } from '$lib/domain/optimization/failures';
import { measureHeadwayLoss } from '$lib/domain/optimization/headway-loss';
import { materializeOptimizedRoute } from '$lib/domain/optimization/materialize';
import { recalculateRoute } from '$lib/domain/optimization/recalculate-route';
import {
	collectRouteFailures,
	selectEarliestArrival
} from '$lib/domain/optimization/select-best-route';
import type { TopologyRoute } from '$lib/domain/optimization/types';
import { AppError } from '$lib/domain/errors';
import { materializeRouteTemplate } from '$lib/domain/route/schedule';
import type { RouteRequest, RouteSearchOptions, TransitRoute } from '$lib/domain/route/route';
import type { RouteProvider } from '$lib/ports/route-provider';
import type { TimetablePort } from '$lib/ports/timetable-port';
import { closestPoint, placePairKey, walkingSecondsBetween, type GeoPoint } from '$lib/utils/geo';
import { fromIso } from '$lib/utils/time';
import { withTimeout } from '$lib/utils/timeout';

interface CachedTopology {
	topologies: TopologyRoute[];
	liveRoute: TransitRoute | null;
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

	async findRoutes(request: RouteRequest, options?: RouteSearchOptions): Promise<TransitRoute[]> {
		const startedAt = Date.now();
		const kakaoStartedAt = Date.now();
		options?.onProgress?.('searchingRoutes');
		const cached = await withTimeout(this.loadTopology(request), ROUTE_SEARCH_TIMEOUT_MS);
		const kakaoMs = Date.now() - kakaoStartedAt;

		if (!cached || cached.topologies.length === 0) {
			return [];
		}

		options?.onProgress?.('routesFound');
		options?.onProgress?.('timingRoutes');

		return withTimeout(
			this.timeTopologies(request, cached.topologies, startedAt, kakaoMs),
			ROUTE_TIMING_TIMEOUT_MS
		);
	}

	private async timeTopologies(
		request: RouteRequest,
		sourceTopologies: TopologyRoute[],
		startedAt: number,
		kakaoMs: number
	): Promise<TransitRoute[]> {
		const prepareStartedAt = Date.now();

		if (this.timetable.prepare) {
			await this.timetable.prepare(collectCandidateRouteIds(sourceTopologies), request.departureAt);
		}

		const prepareMs = Date.now() - prepareStartedAt;
		const walkStartedAt = Date.now();
		const topologies = await Promise.all(
			sourceTopologies.map((topology) =>
				attachAccessWalks(topology, request.origin, request.destination, this.timetable)
			)
		);
		const walkMs = Date.now() - walkStartedAt;
		const recalculateStartedAt = Date.now();
		const recalculated = await Promise.all(
			topologies.map((topology, routeIndex) =>
				recalculateRoute(
					topology,
					request.departureAt,
					request.departureAt,
					this.timetable,
					routeIndex
				)
			)
		);
		const recalculateMs = Date.now() - recalculateStartedAt;

		const routes = recalculated.flatMap((route, index) => {
			const materialized = materializeOptimizedRoute(route, request.departureAt, `gtfs_${index}`);
			return materialized ? [materialized] : [];
		});

		if (routes.length === 0) {
			throw new AppError(
				ERROR_CODES.ROUTE_NOT_FOUND,
				formatRouteFailures(collectRouteFailures(recalculated))
			);
		}

		const headwayStartedAt = Date.now();
		await attachHeadwayLoss(routes, request.departureAt, this.timetable);
		console.info('Recommend GTFS timings', {
			source: this.timetable.source ?? 'unknown',
			kakaoMs,
			prepareMs,
			walkMs,
			recalculateMs,
			headwayMs: Date.now() - headwayStartedAt,
			totalMs: Date.now() - startedAt
		});
		return routes;
	}

	async attachHeadwayLoss(routes: TransitRoute[]): Promise<void> {
		if (routes.length === 0) {
			return;
		}

		const first = routes[0];

		if (!first) {
			return;
		}

		const serviceDate = fromIso(first.departureAt);
		await Promise.all(
			routes.map(async (route) => {
				if (route.headwayLoss !== undefined) {
					return;
				}

				route.headwayLoss = await measureHeadwayLoss(route, serviceDate, this.timetable);
			})
		);
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
		const topologies = mapKakaoRoutesToTopologies(
			payload,
			request.origin.name,
			request.destination.name
		);

		if (topologies.length === 0) {
			return null;
		}

		const liveTemplate = mapKakaoRouteToLiveTemplate(
			payload,
			request.origin.name,
			request.destination.name
		);
		const liveAt = new Date();
		const liveRoute = liveTemplate
			? await materializeRouteTemplate(liveTemplate, {
					provider: 'kakao',
					routeId: `kakao_live_${liveAt.toISOString()}`,
					leaveAt: liveAt
				})
			: null;

		return { topologies, liveRoute };
	}
}

function collectCandidateRouteIds(topologies: TopologyRoute[]): string[] {
	const routeIds: string[] = [];

	for (const topology of topologies) {
		for (const segment of topology.segments) {
			if (segment.type === 'WALK') {
				continue;
			}

			routeIds.push(...segment.candidateRouteIds);
		}
	}

	return routeIds;
}

async function attachHeadwayLoss(
	routes: TransitRoute[],
	serviceDate: Date,
	timetable: TimetablePort
): Promise<void> {
	const winner = selectEarliestArrival(routes);

	if (!winner) {
		return;
	}

	winner.headwayLoss = await measureHeadwayLoss(winner, serviceDate, timetable);
}

async function attachAccessWalks(
	topology: TopologyRoute,
	origin: GeoPoint & { name: string },
	destination: GeoPoint & { name: string },
	timetable: TimetablePort
): Promise<TopologyRoute> {
	if (!timetable.findStopCoordinates) {
		return topology;
	}

	const firstTransit = firstTransitSegment(topology);
	const lastTransit = lastTransitSegment(topology);

	const [toFirstStopSeconds, fromLastStopSeconds] = await Promise.all([
		firstTransit ? walkSecondsToNamedStop(origin, firstTransit.stopId, timetable) : null,
		lastTransit ? walkSecondsToNamedStop(destination, lastTransit.alightStopId, timetable) : null
	]);

	return withAccessWalks(
		topology,
		origin.name,
		destination.name,
		toFirstStopSeconds,
		fromLastStopSeconds
	);
}

async function walkSecondsToNamedStop(
	from: GeoPoint,
	stopName: string,
	timetable: TimetablePort
): Promise<number | null> {
	if (!timetable.findStopCoordinates) {
		return null;
	}

	const points = await timetable.findStopCoordinates(stopName);
	const closest = closestPoint(from, points);

	if (!closest) {
		console.warn('Access walk skipped; GTFS has no coordinates for stop', { stopName });
		return null;
	}

	return walkingSecondsBetween(from, closest);
}

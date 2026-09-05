import type {
	KakaoTransitRoute,
	KakaoTransitStep,
	KakaoTransitResponse
} from '$lib/adapters/kakao/kakao-transit-document';
import type { TopologyRoute } from '$lib/domain/optimization/types';
import type { RouteLegTemplate, RouteTemplate } from '$lib/domain/route/template';
import { walkDurationSeconds } from '$lib/constants/walk';

const STEP_TYPE: Record<string, RouteLegTemplate['type']> = {
	WALKING: 'walk',
	BUS: 'bus',
	SUBWAY: 'subway'
};

export function mapKakaoRoutesToTopologies(
	payload: KakaoTransitResponse,
	originName: string,
	destinationName: string
): TopologyRoute[] {
	if (payload.status !== 'OK' || !payload.routes) {
		return [];
	}

	const topologies: TopologyRoute[] = [];

	for (const route of payload.routes) {
		const topology = mapKakaoRouteToTopology(route, originName, destinationName);

		if (topology) {
			topologies.push(topology);
		}
	}

	return topologies;
}

export function mapKakaoRouteToLiveTemplate(
	payload: KakaoTransitResponse,
	originName: string,
	destinationName: string
): RouteTemplate | null {
	if (payload.status !== 'OK' || !payload.routes) {
		return null;
	}

	for (const route of payload.routes) {
		const template = mapKakaoRouteToTemplate(route, originName, destinationName);

		if (template) {
			return template;
		}
	}

	return null;
}

export function mapKakaoRouteToTemplate(
	route: KakaoTransitRoute,
	originName: string,
	destinationName: string
): RouteTemplate | null {
	const steps = route.steps ?? [];
	const legs: RouteLegTemplate[] = [];

	for (const [index, step] of steps.entries()) {
		const leg = mapKakaoLiveStep(step, index, steps.length, originName, destinationName);

		if (!leg) {
			return null;
		}

		legs.push(leg);
	}

	if (legs.length === 0) {
		return null;
	}

	const transitCount = legs.filter((leg) => leg.type !== 'walk').length;

	return {
		transferCount: route.properties?.transfers ?? Math.max(0, transitCount - 1),
		legs
	};
}

function mapKakaoRouteToTopology(
	route: KakaoTransitRoute,
	originName: string,
	destinationName: string
): TopologyRoute | null {
	const steps = route.steps ?? [];
	const segments: TopologyRoute['segments'] = [];

	for (const [index, step] of steps.entries()) {
		const segment = mapKakaoTopologyStep(step, index, steps.length, originName, destinationName);

		if (segment === 'skip') {
			continue;
		}

		if (!segment) {
			return null;
		}

		segments.push(segment);
	}

	if (segments.length === 0) {
		return null;
	}

	return { segments };
}

function mapKakaoTopologyStep(
	step: KakaoTransitStep,
	index: number,
	stepCount: number,
	originName: string,
	destinationName: string
): TopologyRoute['segments'][number] | 'skip' | null {
	const properties = step.properties;
	const type = properties?.type ? STEP_TYPE[properties.type] : undefined;

	if (!type) {
		return null;
	}

	const places = placeNames(step, index, stepCount, originName, destinationName);

	if (type === 'walk') {
		const duration = walkDurationSeconds(properties?.time ?? 0);

		if (duration <= 0) {
			return 'skip';
		}

		return {
			type: 'WALK',
			duration,
			startPlaceName: places.startPlaceName,
			endPlaceName: places.endPlaceName
		};
	}

	if (!places.firstStop || !places.lastStop) {
		return null;
	}

	if (type === 'bus') {
		const candidateRouteIds = (properties?.vehicles ?? [])
			.map((vehicle) => vehicle.name?.trim())
			.filter((name): name is string => Boolean(name));

		if (candidateRouteIds.length === 0) {
			return null;
		}

		return {
			type: 'BUS',
			stopId: places.firstStop,
			alightStopId: places.lastStop,
			candidateRouteIds,
			startPlaceName: places.startPlaceName,
			endPlaceName: places.endPlaceName
		};
	}

	const lineId = properties?.vehicles?.[0]?.name?.trim();

	if (!lineId) {
		return null;
	}

	return {
		type: 'SUBWAY',
		stopId: places.firstStop,
		alightStopId: places.lastStop,
		candidateRouteIds: [lineId],
		startPlaceName: places.startPlaceName,
		endPlaceName: places.endPlaceName
	};
}

function mapKakaoLiveStep(
	step: KakaoTransitStep,
	index: number,
	stepCount: number,
	originName: string,
	destinationName: string
): RouteLegTemplate | null {
	const properties = step.properties;
	const type = properties?.type ? STEP_TYPE[properties.type] : undefined;
	const durationSeconds =
		type === 'walk' ? walkDurationSeconds(properties?.time ?? 0) : properties?.time;

	if (!type || !durationSeconds || durationSeconds <= 0) {
		return null;
	}

	const places = placeNames(step, index, stepCount, originName, destinationName);
	const vehicle = properties?.vehicles?.[0];

	return {
		type,
		durationSeconds,
		startPlaceName: places.startPlaceName,
		endPlaceName: places.endPlaceName,
		routeId: vehicle?.name,
		routeName: vehicleName(vehicle?.type, vehicle?.name),
		vehicleType: type === 'walk' ? undefined : type
	};
}

function placeNames(
	step: KakaoTransitStep,
	index: number,
	stepCount: number,
	originName: string,
	destinationName: string
) {
	const type = step.properties?.type ? STEP_TYPE[step.properties.type] : undefined;
	const stops = step.properties?.stops ?? [];
	const firstStop = stops[0]?.name?.trim();
	const lastStop = stops[stops.length - 1]?.name?.trim();
	const startPlaceName = type === 'walk' && index === 0 ? originName : firstStop || originName;
	const endPlaceName =
		type === 'walk' && index === stepCount - 1 ? destinationName : lastStop || destinationName;

	return { firstStop, lastStop, startPlaceName, endPlaceName };
}

function vehicleName(kind: string | undefined, name: string | undefined): string | undefined {
	if (!name) {
		return undefined;
	}

	if (!kind) {
		return name;
	}

	return `${kind}:${name}`;
}

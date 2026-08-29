import type {
	KakaoTransitRoute,
	KakaoTransitStep,
	KakaoTransitResponse
} from '$lib/adapters/kakao/kakao-transit-document';
import type { RouteLegTemplate, RouteTemplate } from '$lib/domain/route/template';

const STEP_TYPE: Record<string, RouteLegTemplate['type']> = {
	WALKING: 'walk',
	BUS: 'bus',
	SUBWAY: 'subway'
};

export function pickKakaoTransitRoute(payload: KakaoTransitResponse): KakaoTransitRoute | null {
	if (payload.status !== 'OK' || !payload.routes || payload.routes.length === 0) {
		return null;
	}

	const ranked = [...payload.routes].sort((left, right) => {
		const leftTime = left.properties?.totalTime ?? Number.POSITIVE_INFINITY;
		const rightTime = right.properties?.totalTime ?? Number.POSITIVE_INFINITY;

		if (leftTime !== rightTime) {
			return leftTime - rightTime;
		}

		return (left.properties?.transfers ?? 0) - (right.properties?.transfers ?? 0);
	});

	return ranked[0] ?? null;
}

export function mapKakaoRouteToTemplate(
	route: KakaoTransitRoute,
	originName: string,
	destinationName: string
): RouteTemplate | null {
	const steps = route.steps ?? [];
	const legs: RouteLegTemplate[] = [];

	for (const [index, step] of steps.entries()) {
		const leg = mapKakaoStep(step, index, steps.length, originName, destinationName);

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

function mapKakaoStep(
	step: KakaoTransitStep,
	index: number,
	stepCount: number,
	originName: string,
	destinationName: string
): RouteLegTemplate | null {
	const properties = step.properties;
	const type = properties?.type ? STEP_TYPE[properties.type] : undefined;
	const durationSeconds = properties?.time;

	if (!type || !durationSeconds || durationSeconds <= 0) {
		return null;
	}

	const stops = properties.stops ?? [];
	const firstStop = stops[0]?.name?.trim();
	const lastStop = stops[stops.length - 1]?.name?.trim();
	const vehicle = properties.vehicles?.[0];
	const startPlaceName = type === 'walk' && index === 0 ? originName : firstStop || originName;
	const endPlaceName =
		type === 'walk' && index === stepCount - 1 ? destinationName : lastStop || destinationName;

	return {
		type,
		durationSeconds,
		startPlaceName,
		endPlaceName,
		routeId: vehicle?.name,
		routeName: vehicleName(vehicle?.type, vehicle?.name),
		vehicleType: type === 'walk' ? undefined : type
	};
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

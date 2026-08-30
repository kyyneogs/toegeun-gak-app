import type { Segment, TopologyRoute } from '$lib/domain/optimization/types';
import type { TransitRoute } from '$lib/domain/route/route';
import { fromIso, secondsBetween } from '$lib/utils/time';

export function topologyFromChosenRoute(route: TransitRoute): TopologyRoute | null {
	const segments: Segment[] = [];

	for (const section of route.sections) {
		if (section.type === 'wait') {
			continue;
		}

		if (section.type === 'walk') {
			const duration = secondsBetween(fromIso(section.departureAt), fromIso(section.arrivalAt));

			if (duration <= 0) {
				continue;
			}

			segments.push({
				type: 'WALK',
				duration,
				startPlaceName: section.startPlaceName,
				endPlaceName: section.endPlaceName
			});
			continue;
		}

		if (!section.routeId) {
			return null;
		}

		segments.push({
			type: section.type === 'subway' ? 'SUBWAY' : 'BUS',
			stopId: section.startPlaceName,
			alightStopId: section.endPlaceName,
			candidateRouteIds: [section.routeId],
			startPlaceName: section.startPlaceName,
			endPlaceName: section.endPlaceName
		});
	}

	if (!segments.some((segment) => segment.type !== 'WALK')) {
		return null;
	}

	return { segments };
}

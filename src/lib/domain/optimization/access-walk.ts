import type { Segment, TopologyRoute, TransitSegment } from '$lib/domain/optimization/types';

export function withAccessWalks(
	topology: TopologyRoute,
	originName: string,
	destinationName: string,
	toFirstStopSeconds: number | null,
	fromLastStopSeconds: number | null
): TopologyRoute {
	const segments = [...topology.segments];
	const first = segments[0];

	if (toFirstStopSeconds && toFirstStopSeconds > 0 && first) {
		if (first.type === 'WALK') {
			segments[0] = {
				...first,
				duration: toFirstStopSeconds,
				startPlaceName: originName
			};
		} else {
			segments.unshift({
				type: 'WALK',
				duration: toFirstStopSeconds,
				startPlaceName: originName,
				endPlaceName: first.startPlaceName
			});
		}
	}

	const last = segments[segments.length - 1];

	if (fromLastStopSeconds && fromLastStopSeconds > 0 && last) {
		if (last.type === 'WALK') {
			segments[segments.length - 1] = {
				...last,
				duration: fromLastStopSeconds,
				endPlaceName: destinationName
			};
		} else {
			segments.push({
				type: 'WALK',
				duration: fromLastStopSeconds,
				startPlaceName: last.endPlaceName,
				endPlaceName: destinationName
			});
		}
	}

	return { segments };
}

export function firstTransitSegment(topology: TopologyRoute): TransitSegment | undefined {
	return topology.segments.find(isTransitSegment);
}

export function lastTransitSegment(topology: TopologyRoute): TransitSegment | undefined {
	for (let index = topology.segments.length - 1; index >= 0; index -= 1) {
		const segment = topology.segments[index];

		if (segment && isTransitSegment(segment)) {
			return segment;
		}
	}

	return undefined;
}

function isTransitSegment(segment: Segment): segment is TransitSegment {
	return segment.type !== 'WALK';
}

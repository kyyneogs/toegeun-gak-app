import type { RouteSection, TransitRoute } from '$lib/domain/route/route';
import type { RouteLegTemplate, RouteTemplate } from '$lib/domain/route/template';
import { addSeconds, secondsBetween, toIso } from '$lib/utils/time';

export interface MaterializeRouteOptions {
	provider: string;
	routeId: string;
	leaveAt: Date;
}

export async function materializeRouteTemplate(
	template: RouteTemplate,
	options: MaterializeRouteOptions
): Promise<TransitRoute | null> {
	if (template.legs.length === 0) {
		return null;
	}

	const sections: RouteSection[] = [];
	let cursor = options.leaveAt;
	let walkingTimeSeconds = 0;
	let movingTimeSeconds = 0;
	let sequence = 1;

	for (const leg of template.legs) {
		const arrivalAt = addSeconds(cursor, leg.durationSeconds);
		sections.push(legSection(leg, sequence, cursor, arrivalAt));
		sequence += 1;
		movingTimeSeconds += leg.durationSeconds;
		if (leg.type === 'walk') {
			walkingTimeSeconds += leg.durationSeconds;
		}
		cursor = arrivalAt;
	}

	return {
		provider: options.provider,
		routeId: options.routeId,
		totalTimeSeconds: secondsBetween(options.leaveAt, cursor),
		movingTimeSeconds,
		waitingTimeSeconds: 0,
		walkingTimeSeconds,
		transferCount: template.transferCount,
		departureAt: toIso(options.leaveAt),
		arrivalAt: toIso(cursor),
		sections
	};
}

function legSection(
	leg: RouteLegTemplate,
	sequence: number,
	departureAt: Date,
	arrivalAt: Date
): RouteSection {
	return {
		sequence,
		type: leg.type,
		startPlaceName: leg.startPlaceName,
		endPlaceName: leg.endPlaceName,
		departureAt: toIso(departureAt),
		arrivalAt: toIso(arrivalAt),
		waitingTimeSeconds: 0,
		routeId: leg.routeId,
		routeName: leg.routeName,
		vehicleType: leg.vehicleType
	};
}

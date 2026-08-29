import type { RouteSection, TransitRoute } from '$lib/domain/route/route';
import type { RouteLegTemplate, RouteTemplate } from '$lib/domain/route/template';
import type { ScheduleSource, TimetableDeparture } from '$lib/domain/route/timetable';
import { addSeconds, secondsBetween, toIso } from '$lib/utils/time';

export interface MaterializeRouteOptions {
	provider: string;
	routeId: string;
	leaveAt: Date;
	applyHeadwayWait: boolean;
	resolveFirstDeparture?: (arriveAtStop: Date) => Promise<TimetableDeparture | null>;
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
	let waitingTimeSeconds = 0;
	let walkingTimeSeconds = 0;
	let movingTimeSeconds = 0;
	let appliedFirstWait = false;
	let sequence = 1;
	let scheduleSource: ScheduleSource | undefined;

	for (const leg of template.legs) {
		const wait = await maybeHeadwayWait(leg, cursor, options, appliedFirstWait, sequence);

		if (wait === 'expired') {
			return null;
		}

		if (wait) {
			if (wait.section) {
				sections.push(wait.section);
			}
			waitingTimeSeconds += wait.waitingTimeSeconds;
			cursor = wait.cursor;
			sequence = wait.sequence;
			appliedFirstWait = true;
			scheduleSource = wait.source;
		}

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
		waitingTimeSeconds,
		walkingTimeSeconds,
		transferCount: template.transferCount,
		departureAt: toIso(options.leaveAt),
		arrivalAt: toIso(cursor),
		sections,
		scheduleSource
	};
}

async function maybeHeadwayWait(
	leg: RouteLegTemplate,
	cursor: Date,
	options: MaterializeRouteOptions,
	appliedFirstWait: boolean,
	sequence: number
) {
	const isTransit = leg.type === 'bus' || leg.type === 'subway';

	if (!options.applyHeadwayWait || !isTransit || appliedFirstWait) {
		return null;
	}

	if (!options.resolveFirstDeparture) {
		throw new Error('resolveFirstDeparture is required when applyHeadwayWait is true');
	}

	const departure = await options.resolveFirstDeparture(cursor);

	if (!departure) {
		return 'expired' as const;
	}

	const waitSeconds = secondsBetween(cursor, departure.departureAt);

	if (waitSeconds <= 0) {
		return {
			cursor: departure.departureAt,
			waitingTimeSeconds: 0,
			sequence,
			section: undefined,
			source: departure.source
		};
	}

	return {
		cursor: departure.departureAt,
		waitingTimeSeconds: waitSeconds,
		sequence: sequence + 1,
		source: departure.source,
		section: {
			sequence,
			type: 'wait' as const,
			startPlaceName: leg.startPlaceName,
			endPlaceName: leg.startPlaceName,
			departureAt: toIso(cursor),
			arrivalAt: toIso(departure.departureAt),
			waitingTimeSeconds: waitSeconds
		}
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

export function firstTransitLeg(template: RouteTemplate): RouteLegTemplate | undefined {
	return template.legs.find((leg) => leg.type === 'bus' || leg.type === 'subway');
}

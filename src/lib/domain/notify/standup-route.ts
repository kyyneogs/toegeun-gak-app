import type { RecommendedRoute } from '$lib/domain/recommendation/types';
import type { RouteSection, RouteSectionType } from '$lib/domain/route/route';
import type { ScheduleSource } from '$lib/domain/route/timetable';
import { transitLineLabel } from '$lib/utils/route-label';

const SECTION_TYPES: readonly RouteSectionType[] = ['walk', 'bus', 'subway', 'wait'];
const MAX_ROUTE_SECTIONS = 24;
const MAX_PLACE_NAME_LENGTH = 80;

export interface StandupJobRoute {
	originName: string;
	destinationName: string;
	departureAt: string;
	arrivalAt: string;
	lineLabel: string;
	totalTimeSeconds: number;
	scheduleSource?: ScheduleSource;
	sections: RouteSection[];
}

export function standupRouteFromDisplayed(
	displayed: RecommendedRoute,
	originName: string,
	destinationName: string,
	scheduleSource?: ScheduleSource
): StandupJobRoute {
	return {
		originName,
		destinationName,
		departureAt: displayed.departureAt,
		arrivalAt: displayed.expectedArrivalAt,
		lineLabel: transitLineLabel(displayed.route.sections),
		totalTimeSeconds: displayed.totalTimeSeconds,
		scheduleSource,
		sections: displayed.route.sections
	};
}

export function parseStandupJobRoute(value: unknown): StandupJobRoute | null {
	const record = asRouteRecord(value);

	if (!record) {
		return null;
	}
	const originName = clippedName(record.originName);
	const destinationName = clippedName(record.destinationName);
	const departureAt = stringField(record.departureAt);
	const arrivalAt = stringField(record.arrivalAt);
	const lineLabel = clippedName(record.lineLabel);
	const totalTimeSeconds = Number(record.totalTimeSeconds);
	const sections = parseSections(record.sections);

	if (
		!originName ||
		!destinationName ||
		!departureAt ||
		!arrivalAt ||
		!lineLabel ||
		!Number.isFinite(totalTimeSeconds) ||
		totalTimeSeconds < 0 ||
		!sections
	) {
		return null;
	}

	return {
		originName,
		destinationName,
		departureAt,
		arrivalAt,
		lineLabel,
		totalTimeSeconds,
		scheduleSource: record.scheduleSource === 'gtfs' ? 'gtfs' : undefined,
		sections
	};
}

function parseSections(value: unknown): RouteSection[] | null {
	if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ROUTE_SECTIONS) {
		return null;
	}

	const sections: RouteSection[] = [];

	for (const item of value) {
		if (!item || typeof item !== 'object') {
			return null;
		}

		const record = item as Record<string, unknown>;
		const type = record.type;

		if (!isSectionType(type)) {
			return null;
		}

		const startPlaceName = clippedName(record.startPlaceName);
		const endPlaceName = clippedName(record.endPlaceName);
		const departureAt = stringField(record.departureAt);
		const arrivalAt = stringField(record.arrivalAt);
		const sequence = Number(record.sequence);
		const waitingTimeSeconds = Number(record.waitingTimeSeconds ?? 0);

		if (
			!startPlaceName ||
			!endPlaceName ||
			!departureAt ||
			!arrivalAt ||
			!Number.isInteger(sequence) ||
			!Number.isFinite(waitingTimeSeconds)
		) {
			return null;
		}

		const routeName = stringField(record.routeName);
		sections.push({
			sequence,
			type,
			startPlaceName,
			endPlaceName,
			departureAt,
			arrivalAt,
			waitingTimeSeconds,
			routeName: routeName || undefined
		});
	}

	return sections;
}

function asRouteRecord(value: unknown): Record<string, unknown> | null {
	if (typeof value === 'string') {
		try {
			value = JSON.parse(value) as unknown;
		} catch {
			return null;
		}
	}

	if (!value || typeof value !== 'object') {
		return null;
	}

	return value as Record<string, unknown>;
}

function isSectionType(value: unknown): value is RouteSectionType {
	return typeof value === 'string' && (SECTION_TYPES as readonly string[]).includes(value);
}

function clippedName(value: unknown): string {
	const text = stringField(value);
	return text.slice(0, MAX_PLACE_NAME_LENGTH);
}

function stringField(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

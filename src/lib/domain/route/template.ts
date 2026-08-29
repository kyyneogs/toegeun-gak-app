import type { RouteSectionType } from '$lib/domain/route/route';

export interface RouteLegTemplate {
	type: Exclude<RouteSectionType, 'wait'>;
	durationSeconds: number;
	startPlaceName: string;
	endPlaceName: string;
	routeId?: string;
	routeName?: string;
	vehicleType?: string;
}

export interface RouteTemplate {
	transferCount: number;
	legs: RouteLegTemplate[];
}

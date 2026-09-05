import type { RouteRequest, RouteSearchOptions, TransitRoute } from '$lib/domain/route/route';

export interface RouteProvider {
	findRoutes(request: RouteRequest, options?: RouteSearchOptions): Promise<TransitRoute[]>;
	findLiveRoute?(
		request: Pick<RouteRequest, 'origin' | 'destination'>
	): Promise<TransitRoute | null>;
	attachHeadwayLoss?(routes: TransitRoute[]): Promise<void>;
}

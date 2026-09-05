import type { RouteRequest, TransitRoute } from '$lib/domain/route/route';
import type { TransitConfiguredStatus } from '$lib/ports/route-connection';
import type { RouteProvider } from '$lib/ports/route-provider';

export class AdaptiveRouteProvider implements RouteProvider {
	private resolved: RouteProvider | null = null;

	constructor(
		private readonly live: RouteProvider,
		private readonly fallback: RouteProvider,
		private readonly readStatus: () => Promise<TransitConfiguredStatus>
	) {}

	async findRoutes(request: RouteRequest): Promise<TransitRoute[]> {
		const provider = await this.resolve();
		return provider.findRoutes(request);
	}

	async findLiveRoute(
		request: Pick<RouteRequest, 'origin' | 'destination'>
	): Promise<TransitRoute | null> {
		const provider = await this.resolve();

		if (!provider.findLiveRoute) {
			return null;
		}

		return provider.findLiveRoute(request);
	}

	async attachHeadwayLoss(routes: TransitRoute[]): Promise<void> {
		const provider = await this.resolve();
		await provider.attachHeadwayLoss?.(routes);
	}

	private async resolve(): Promise<RouteProvider> {
		if (this.resolved) {
			return this.resolved;
		}

		try {
			const status = await this.readStatus();
			this.resolved = status.configured ? this.live : this.fallback;
		} catch (cause) {
			console.error('Transit status check failed, using mock routes', cause);
			this.resolved = this.fallback;
		}

		return this.resolved;
	}
}

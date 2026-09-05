import { ERROR_USER_MESSAGES } from '$lib/constants/errors';
import type { RouteFailure } from '$lib/domain/optimization/types';

export function formatRouteFailures(failures: RouteFailure[]): string {
	if (failures.length === 0) {
		return ERROR_USER_MESSAGES.ROUTE_NOT_FOUND;
	}

	const details = failures.map((failure) => {
		const routes = failure.candidateRouteIds.join(', ');
		return `경로 ${failure.routeIndex + 1}: ${failure.stopName}에서 ${routes} 다음 차가 없어요.`;
	});

	return `${ERROR_USER_MESSAGES.ROUTE_NOT_FOUND} ${details.join(' ')}`;
}

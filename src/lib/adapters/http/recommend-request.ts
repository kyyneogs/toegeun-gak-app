import { isRouteCriterion, type RouteCriterion } from '$lib/domain/recommendation/criteria';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parseNamedPoint(
	value: unknown
): { name: string; latitude: number; longitude: number } | null {
	if (!isRecord(value)) {
		return null;
	}

	const name = typeof value.name === 'string' ? value.name.trim() : '';
	const latitude = Number(value.latitude);
	const longitude = Number(value.longitude);

	if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}

	return { name, latitude, longitude };
}

export interface RecommendRequestBody {
	origin: { name: string; latitude: number; longitude: number };
	destination: { name: string; latitude: number; longitude: number };
	departureFrom: string;
	desiredArrivalAt?: string;
	criterion?: RouteCriterion;
}

export function parseRecommendRequest(body: unknown): RecommendRequestBody | null {
	if (!isRecord(body)) {
		return null;
	}

	const origin = parseNamedPoint(body.origin);
	const destination = parseNamedPoint(body.destination);
	const departureFrom = typeof body.departureFrom === 'string' ? body.departureFrom : '';
	const desiredArrivalAt =
		typeof body.desiredArrivalAt === 'string' && body.desiredArrivalAt.length > 0
			? body.desiredArrivalAt
			: undefined;
	const criterion =
		typeof body.criterion === 'string' && isRouteCriterion(body.criterion)
			? body.criterion
			: undefined;

	if (!origin || !destination || Number.isNaN(new Date(departureFrom).getTime())) {
		return null;
	}

	if (desiredArrivalAt && Number.isNaN(new Date(desiredArrivalAt).getTime())) {
		return null;
	}

	return { origin, destination, departureFrom, desiredArrivalAt, criterion };
}

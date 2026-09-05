import type { RouteRequest } from '$lib/domain/route/route';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parseNamedPoint(value: unknown): RouteRequest['origin'] | null {
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

export function parseTransitRequest(body: unknown): RouteRequest | null {
	if (!isRecord(body)) {
		return null;
	}

	const origin = parseNamedPoint(body.origin);
	const destination = parseNamedPoint(body.destination);
	const departureAt = typeof body.departureAt === 'string' ? new Date(body.departureAt) : null;

	if (!origin || !destination || !departureAt || Number.isNaN(departureAt.getTime())) {
		return null;
	}

	return { origin, destination, departureAt };
}

export function isLiveOnlyTransitRequest(body: unknown): boolean {
	return isRecord(body) && body.liveOnly === true;
}

import { EARTH_RADIUS_METERS, WALKING_SPEED_METERS_PER_SECOND } from '$lib/constants/walk';

export const COORDINATE_CACHE_PRECISION = 5;

export interface GeoPoint {
	latitude: number;
	longitude: number;
}

export function distanceMeters(from: GeoPoint, to: GeoPoint): number {
	const fromLat = toRadians(from.latitude);
	const toLat = toRadians(to.latitude);
	const deltaLat = toRadians(to.latitude - from.latitude);
	const deltaLng = toRadians(to.longitude - from.longitude);
	const haversine =
		Math.sin(deltaLat / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

	return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function closestPoint(origin: GeoPoint, candidates: readonly GeoPoint[]): GeoPoint | null {
	let best: GeoPoint | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const point of candidates) {
		const distance = distanceMeters(origin, point);

		if (best === null || distance < bestDistance) {
			best = point;
			bestDistance = distance;
		}
	}

	return best;
}

export function walkingSecondsBetween(from: GeoPoint, to: GeoPoint): number {
	return Math.round(distanceMeters(from, to) / WALKING_SPEED_METERS_PER_SECOND);
}

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

export function roundCoordinate(value: number): string {
	return value.toFixed(COORDINATE_CACHE_PRECISION);
}

export function toMinuteStamp(date: Date): string {
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');

	return `${year}${month}${day}${hours}${minutes}`;
}

export function placePairKey(origin: GeoPoint, destination: GeoPoint): string {
	return [
		roundCoordinate(origin.latitude),
		roundCoordinate(origin.longitude),
		roundCoordinate(destination.latitude),
		roundCoordinate(destination.longitude)
	].join(':');
}

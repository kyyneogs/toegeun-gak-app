export const COORDINATE_CACHE_PRECISION = 5;

export interface GeoPoint {
	latitude: number;
	longitude: number;
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

import type { TripChoice } from '$lib/domain/optimization/types';
import type { GeoPoint } from '$lib/utils/geo';

export type TimetableSource = 'csv' | 'sql' | 'empty';

export interface NextTripQuery {
	routeId: string;
	boardStopName: string;
	alightStopName: string;
	after: Date;
	serviceDate: Date;
}

export interface TimetablePort {
	readonly source?: TimetableSource;
	findNextTrip(query: NextTripQuery): Promise<TripChoice | null>;
	prepare?(routeIds: string[], serviceDate: Date): Promise<void>;
	findStopCoordinates?(stopName: string): Promise<GeoPoint[]>;
}

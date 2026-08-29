export type ScheduleSource = 'gtfs' | 'estimated';

export interface TimetableLookup {
	routeName: string;
	stopName: string;
	after: Date;
}

export interface TimetableDeparture {
	departureAt: Date;
	source: ScheduleSource;
}

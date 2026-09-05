export const GTFS_EXCEPTION_ADDED = '1';
export const GTFS_EXCEPTION_REMOVED = '2';

export const GTFS_CALENDAR_DAY_COLUMNS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
] as const;

export interface GtfsCalendarWindow {
	startDate: string;
	endDate: string;
	days: readonly string[];
}

export function toGtfsDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

export function calendarDateKey(serviceId: string, date: string): string {
	return `${serviceId}\0${date}`;
}

export function isCalendarServiceActive(
	exceptionType: string | undefined,
	calendar: GtfsCalendarWindow | undefined,
	date: Date
): boolean {
	if (exceptionType === GTFS_EXCEPTION_REMOVED) {
		return false;
	}

	if (exceptionType === GTFS_EXCEPTION_ADDED) {
		return true;
	}

	if (!calendar) {
		return false;
	}

	const ymd = toGtfsDate(date);

	if (calendar.startDate && ymd < calendar.startDate) {
		return false;
	}

	if (calendar.endDate && ymd > calendar.endDate) {
		return false;
	}

	return calendar.days[date.getDay()] === '1';
}

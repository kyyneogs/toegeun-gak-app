import { SEOUL_TIME_ZONE } from '$lib/constants/persist';
import { fromIso, secondsBetween } from '$lib/utils/time';

export function savedArrivalSeconds(committedArrivalAt: string, naiveArrivalAt: string): number {
	return Math.max(0, secondsBetween(fromIso(committedArrivalAt), fromIso(naiveArrivalAt)));
}

export function startOfLocalWeek(reference: Date): Date {
	const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
	const weekday = start.getDay();
	const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
	start.setDate(start.getDate() - daysFromMonday);
	return start;
}

export function startOfLocalMonth(reference: Date): Date {
	return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

export function localServiceDate(reference: Date): string {
	const year = String(reference.getFullYear());
	const month = String(reference.getMonth() + 1).padStart(2, '0');
	const day = String(reference.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function formatSavedDuration(totalSeconds: number): string {
	const minutes = Math.max(0, Math.round(totalSeconds / 60));
	const hours = Math.floor(minutes / 60);
	const remain = minutes % 60;

	if (hours === 0) {
		return `${remain}분`;
	}

	if (remain === 0) {
		return `${hours}시간`;
	}

	return `${hours}시간 ${remain}분`;
}

export function clockMinutesInSeoul(iso: string): number {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: SEOUL_TIME_ZONE,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(fromIso(iso));
	const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
	const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
	return hour * 60 + minute;
}

export function startOfSeoulWeek(reference: Date): Date {
	const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: SEOUL_TIME_ZONE }).format(reference);
	const [year, month, day] = dateStr.split('-').map(Number);
	const weekday = new Date(`${dateStr}T12:00:00+09:00`).getUTCDay();
	const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
	const mondayUtcMidnight = Date.UTC(year, month - 1, day - daysFromMonday);
	return new Date(mondayUtcMidnight - 9 * 60 * 60 * 1000);
}

export function seoulServiceDate(reference: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: SEOUL_TIME_ZONE }).format(reference);
}

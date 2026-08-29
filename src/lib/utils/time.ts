const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isClockTime(value: string): boolean {
	return CLOCK_PATTERN.test(value);
}

export function startOfLocalDay(reference = new Date()): Date {
	return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
}

export function combineLocalDateAndClock(clock: string, reference = new Date()): Date {
	if (!isClockTime(clock)) {
		throw new Error(`Invalid clock time: ${clock}`);
	}

	const [hours, minutes] = clock.split(':').map(Number);
	return new Date(
		reference.getFullYear(),
		reference.getMonth(),
		reference.getDate(),
		hours,
		minutes,
		0,
		0
	);
}

export function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addSeconds(date: Date, seconds: number): Date {
	return new Date(date.getTime() + seconds * 1000);
}

export function minutesBetween(from: Date, to: Date): number {
	return Math.round((to.getTime() - from.getTime()) / 60000);
}

export function secondsBetween(from: Date, to: Date): number {
	return Math.round((to.getTime() - from.getTime()) / 1000);
}

export function formatClock(date: Date): string {
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
}

export function formatDurationMinutes(totalSeconds: number): string {
	const minutes = Math.max(0, Math.round(totalSeconds / 60));
	return `${minutes}분`;
}

export function toIso(date: Date): string {
	return date.toISOString();
}

export function fromIso(value: string): Date {
	return new Date(value);
}

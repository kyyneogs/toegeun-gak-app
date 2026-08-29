import { addMinutes } from '$lib/utils/time';

export function nextBusAt(
	arriveAtStop: Date,
	firstBus: Date,
	lastBus: Date,
	intervalMinutes: number
): Date | null {
	if (arriveAtStop.getTime() > lastBus.getTime()) {
		return null;
	}

	let bus = new Date(firstBus);

	while (bus.getTime() < arriveAtStop.getTime()) {
		bus = addMinutes(bus, intervalMinutes);

		if (bus.getTime() > lastBus.getTime()) {
			return null;
		}
	}

	return bus;
}

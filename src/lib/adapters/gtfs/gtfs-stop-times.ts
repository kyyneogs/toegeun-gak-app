import { createReadStream } from 'node:fs';
import { parseGtfsClockToSeconds } from '$lib/adapters/gtfs/gtfs-clock';
import { parseCsvLine, stripBom } from '$lib/adapters/gtfs/gtfs-csv';

const STREAM_BUFFER_BYTES = 4 * 1024 * 1024;

export interface LoadedStopTime {
	stopId: string;
	sequence: number;
	arrivalSeconds: number;
	departureSeconds: number;
}

export async function loadStopTimesForTrips(
	filePath: string,
	tripIds: ReadonlySet<string>,
	into: Map<string, LoadedStopTime[]>
): Promise<void> {
	if (tripIds.size === 0) {
		return;
	}

	const stream = createReadStream(filePath, {
		encoding: 'utf8',
		highWaterMark: STREAM_BUFFER_BYTES
	});

	let leftover = '';
	let headerIndexes: StopTimeHeaderIndexes | null = null;
	let isFirstChunk = true;

	try {
		for await (const chunk of stream) {
			leftover += chunk;

			if (isFirstChunk) {
				leftover = stripBom(leftover);
				isFirstChunk = false;
			}

			const lines = leftover.split('\n');
			leftover = lines.pop() ?? '';

			for (const rawLine of lines) {
				const line = rawLine.replace(/\r$/, '');

				if (line.length === 0) {
					continue;
				}

				if (!headerIndexes) {
					headerIndexes = readStopTimeHeader(line);
					continue;
				}

				appendMatchingStopTime(line, tripIds, headerIndexes, into);
			}
		}

		const lastLine = leftover.replace(/\r$/, '');

		if (lastLine.length > 0 && headerIndexes) {
			appendMatchingStopTime(lastLine, tripIds, headerIndexes, into);
		}
	} finally {
		stream.destroy();
	}
}

interface StopTimeHeaderIndexes {
	tripId: number;
	arrival: number;
	departure: number;
	stopId: number;
	sequence: number;
}

function readStopTimeHeader(line: string): StopTimeHeaderIndexes {
	const fields = parseCsvLine(line).map((header) => header.trim());

	return {
		tripId: fieldIndex(fields, 'trip_id'),
		arrival: fieldIndex(fields, 'arrival_time'),
		departure: fieldIndex(fields, 'departure_time'),
		stopId: fieldIndex(fields, 'stop_id'),
		sequence: fieldIndex(fields, 'stop_sequence')
	};
}

function fieldIndex(headers: string[], name: string): number {
	const index = headers.indexOf(name);

	if (index < 0) {
		throw new Error(`stop_times.txt is missing column ${name}`);
	}

	return index;
}

function appendMatchingStopTime(
	line: string,
	needed: ReadonlySet<string>,
	indexes: StopTimeHeaderIndexes,
	into: Map<string, LoadedStopTime[]>
): void {
	if (indexes.tripId === 0) {
		const tripId = firstCsvField(line);

		if (!needed.has(tripId)) {
			return;
		}
	}

	const fields = parseCsvLine(line);
	const tripId = fields[indexes.tripId] ?? '';

	if (!needed.has(tripId)) {
		return;
	}

	const stopId = fields[indexes.stopId] ?? '';
	const departureSeconds = parseGtfsClockToSeconds(
		fields[indexes.departure] || fields[indexes.arrival] || ''
	);
	const arrivalSeconds = parseGtfsClockToSeconds(
		fields[indexes.arrival] || fields[indexes.departure] || ''
	);
	const sequence = Number.parseInt(fields[indexes.sequence] ?? '', 10);

	if (!stopId || departureSeconds === null || arrivalSeconds === null || Number.isNaN(sequence)) {
		return;
	}

	const points = into.get(tripId) ?? [];
	points.push({ stopId, sequence, arrivalSeconds, departureSeconds });
	into.set(tripId, points);
}

function firstCsvField(line: string): string {
	const comma = line.indexOf(',');
	return comma < 0 ? line : line.slice(0, comma);
}

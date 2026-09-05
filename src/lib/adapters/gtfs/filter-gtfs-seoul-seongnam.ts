import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { parseCsvLine, stripBom } from '$lib/adapters/gtfs/gtfs-csv';
import { GTFS_REQUIRED_FILES } from '$lib/adapters/gtfs/gtfs-timetable';
import {
	isPointInBoundingBox,
	SEONGNAM_BOUNDING_BOX,
	SEOUL_BOUNDING_BOX
} from '$lib/constants/gtfs-region';

const COPY_AS_IS = ['agency.txt', 'calendar.txt', 'calendar_dates.txt'] as const;

export interface FilterGtfsResult {
	routes: number;
	trips: number;
	stops: number;
	stopTimes: number;
}

interface StopRegion {
	seoul: boolean;
	seongnam: boolean;
}

export async function filterGtfsToSeoulAndSeongnam(
	sourceDirectory: string,
	outputDirectory: string
): Promise<FilterGtfsResult> {
	assertRequiredFiles(sourceDirectory);
	mkdirSync(outputDirectory, { recursive: true });

	const stops = await loadStopRegions(join(sourceDirectory, 'stops.txt'));
	const tripRoute = await loadTripRoutes(join(sourceDirectory, 'trips.txt'));
	const keepRouteIds = await collectRoutesServingBothCities(
		join(sourceDirectory, 'stop_times.txt'),
		tripRoute,
		stops
	);
	const keepTripIds = new Set(
		[...tripRoute.entries()]
			.filter(([, routeId]) => keepRouteIds.has(routeId))
			.map(([tripId]) => tripId)
	);

	const referencedStopIds = await writeFilteredCsv(
		join(sourceDirectory, 'stop_times.txt'),
		join(outputDirectory, 'stop_times.txt'),
		(fields) => keepTripIds.has(fields[0] ?? ''),
		3
	);

	await writeFilteredCsv(
		join(sourceDirectory, 'routes.txt'),
		join(outputDirectory, 'routes.txt'),
		(fields) => keepRouteIds.has(fields[0] ?? '')
	);
	await writeFilteredCsv(
		join(sourceDirectory, 'trips.txt'),
		join(outputDirectory, 'trips.txt'),
		(fields) => keepRouteIds.has(fields[0] ?? '')
	);
	await writeFilteredCsv(
		join(sourceDirectory, 'stops.txt'),
		join(outputDirectory, 'stops.txt'),
		(fields) => referencedStopIds.has(fields[0] ?? '')
	);

	for (const fileName of COPY_AS_IS) {
		const sourcePath = join(sourceDirectory, fileName);

		if (existsSync(sourcePath)) {
			await copyFile(sourcePath, join(outputDirectory, fileName));
		}
	}

	return {
		routes: keepRouteIds.size,
		trips: keepTripIds.size,
		stops: referencedStopIds.size,
		stopTimes: await countDataRows(join(outputDirectory, 'stop_times.txt'))
	};
}

function assertRequiredFiles(directory: string): void {
	const missing = GTFS_REQUIRED_FILES.filter((fileName) => !existsSync(join(directory, fileName)));

	if (missing.length > 0) {
		throw new Error(`GTFS source is missing required files: ${missing.join(', ')}`);
	}
}

async function loadStopRegions(filePath: string): Promise<Map<string, StopRegion>> {
	const stops = new Map<string, StopRegion>();

	await forEachDataLine(filePath, (fields) => {
		const stopId = fields[0];
		const latitude = Number(fields[2]);
		const longitude = Number(fields[3]);

		if (!stopId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
			return;
		}

		stops.set(stopId, {
			seoul: isPointInBoundingBox(latitude, longitude, SEOUL_BOUNDING_BOX),
			seongnam: isPointInBoundingBox(latitude, longitude, SEONGNAM_BOUNDING_BOX)
		});
	});

	return stops;
}

async function loadTripRoutes(filePath: string): Promise<Map<string, string>> {
	const tripRoute = new Map<string, string>();

	await forEachDataLine(filePath, (fields) => {
		const routeId = fields[0];
		const tripId = fields[2];

		if (routeId && tripId) {
			tripRoute.set(tripId, routeId);
		}
	});

	return tripRoute;
}

async function collectRoutesServingBothCities(
	stopTimesPath: string,
	tripRoute: Map<string, string>,
	stops: Map<string, StopRegion>
): Promise<Set<string>> {
	const seoulRoutes = new Set<string>();
	const seongnamRoutes = new Set<string>();

	await forEachDataLine(stopTimesPath, (fields) => {
		const routeId = tripRoute.get(fields[0] ?? '');
		const region = stops.get(fields[3] ?? '');

		if (!routeId || !region) {
			return;
		}

		if (region.seoul) {
			seoulRoutes.add(routeId);
		}

		if (region.seongnam) {
			seongnamRoutes.add(routeId);
		}
	});

	return new Set([...seoulRoutes].filter((routeId) => seongnamRoutes.has(routeId)));
}

async function writeFilteredCsv(
	sourcePath: string,
	outputPath: string,
	keepRow: (fields: string[]) => boolean,
	collectStopIdIndex?: number
): Promise<Set<string>> {
	const collected = new Set<string>();
	const output = createWriteStream(outputPath, { encoding: 'utf8' });
	const stream = createReadStream(sourcePath, { encoding: 'utf8' });
	const lines = createInterface({ input: stream, crlfDelay: Infinity });
	let wroteHeader = false;

	try {
		for await (const rawLine of lines) {
			const line = stripBom(rawLine).replace(/\r$/, '');

			if (line.trim().length === 0) {
				continue;
			}

			if (!wroteHeader) {
				output.write(`${line}\n`);
				wroteHeader = true;
				continue;
			}

			const fields = parseCsvLine(line);

			if (!keepRow(fields)) {
				continue;
			}

			if (collectStopIdIndex !== undefined) {
				const stopId = fields[collectStopIdIndex];

				if (stopId) {
					collected.add(stopId);
				}
			}

			output.write(`${line}\n`);
		}
	} finally {
		lines.close();
		stream.destroy();
		await closeWriteStream(output);
	}

	return collected;
}

async function forEachDataLine(
	filePath: string,
	onFields: (fields: string[]) => void
): Promise<void> {
	const stream = createReadStream(filePath, { encoding: 'utf8' });
	const lines = createInterface({ input: stream, crlfDelay: Infinity });
	let isHeader = true;

	try {
		for await (const rawLine of lines) {
			const line = stripBom(rawLine).replace(/\r$/, '');

			if (line.trim().length === 0) {
				continue;
			}

			if (isHeader) {
				isHeader = false;
				continue;
			}

			onFields(parseCsvLine(line));
		}
	} finally {
		lines.close();
		stream.destroy();
	}
}

async function countDataRows(filePath: string): Promise<number> {
	let count = 0;
	await forEachDataLine(filePath, () => {
		count += 1;
	});
	return count;
}

function closeWriteStream(output: ReturnType<typeof createWriteStream>): Promise<void> {
	return new Promise((resolve, reject) => {
		output.end(() => resolve());
		output.on('error', reject);
	});
}

import { resolve } from 'node:path';
import { filterGtfsToSeoulAndSeongnam } from '$lib/adapters/gtfs/filter-gtfs-seoul-seongnam';
import { GTFS_FULL_FEED_DIR, GTFS_SEOUL_SEONGNAM_DIR } from '$lib/constants/gtfs-paths';

const sourceDirectory = process.env.GTFS_SOURCE_DIR?.trim() || GTFS_FULL_FEED_DIR;
const outputDirectory = process.env.GTFS_OUT_DIR?.trim() || GTFS_SEOUL_SEONGNAM_DIR;

const result = await filterGtfsToSeoulAndSeongnam(
	resolve(sourceDirectory),
	resolve(outputDirectory)
);
console.info('GTFS Seoul+Seongnam slice written', {
	sourceDirectory: resolve(sourceDirectory),
	outputDirectory: resolve(outputDirectory),
	...result
});

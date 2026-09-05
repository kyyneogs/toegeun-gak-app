import { resolve } from 'node:path';
import { filterGtfsToSeoulAndSeongnam } from '$lib/adapters/gtfs/filter-gtfs-seoul-seongnam';

const sourceDirectory = process.env.GTFS_DIR?.trim();
const outputDirectory = process.env.GTFS_OUT_DIR?.trim();

if (!sourceDirectory || !outputDirectory) {
	console.error('GTFS_DIR and GTFS_OUT_DIR are required');
	process.exit(1);
}

const result = await filterGtfsToSeoulAndSeongnam(
	resolve(sourceDirectory),
	resolve(outputDirectory)
);
console.info('GTFS Seoul+Seongnam slice written', {
	outputDirectory: resolve(outputDirectory),
	...result
});

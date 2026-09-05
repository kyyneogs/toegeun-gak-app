export const GTFS_FULL_FEED_DIR = './data/gtfs';
export const GTFS_SEOUL_SEONGNAM_DIR = './data/gtfs-seoul-seongnam';

export function localGtfsDirectory(configured: string | undefined): string {
	const trimmed = configured?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : GTFS_SEOUL_SEONGNAM_DIR;
}

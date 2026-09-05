import { localGtfsDirectory } from '$lib/constants/gtfs-paths';
import { describe, expect, it } from 'vitest';

describe('localGtfsDirectory', () => {
	it('uses the Seoul-Seongnam slice when GTFS_DIR is empty', () => {
		expect(localGtfsDirectory(undefined)).toBe('./data/gtfs-seoul-seongnam');
		expect(localGtfsDirectory('  ')).toBe('./data/gtfs-seoul-seongnam');
	});

	it('keeps an explicit GTFS_DIR', () => {
		expect(localGtfsDirectory('./data/gtfs')).toBe('./data/gtfs');
	});
});

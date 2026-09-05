import { chooseGtfsTimetableSource } from '$lib/adapters/gtfs/gtfs-source';
import { describe, expect, it } from 'vitest';

describe('chooseGtfsTimetableSource', () => {
	it('uses SQL when DATABASE_URL points at a loaded slice', () => {
		expect(
			chooseGtfsTimetableSource({
				remotePostgres: true,
				hasSqlSlice: true,
				hasLocalCsv: true
			})
		).toBe('sql');
	});

	it('does not fall back to local CSV when remote Postgres is configured', () => {
		expect(
			chooseGtfsTimetableSource({
				remotePostgres: true,
				hasSqlSlice: false,
				hasLocalCsv: true
			})
		).toBe('empty');
	});

	it('uses local CSV only without DATABASE_URL', () => {
		expect(
			chooseGtfsTimetableSource({
				remotePostgres: false,
				hasSqlSlice: false,
				hasLocalCsv: true
			})
		).toBe('csv');
	});
});

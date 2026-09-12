import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterGtfsToSeoulAndSeongnam } from '$lib/adapters/gtfs/filter-gtfs-seoul-seongnam';
import { afterEach, describe, expect, it } from 'vitest';

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/simple');
let outputDirectory = '';

afterEach(async () => {
	if (outputDirectory) {
		await rm(outputDirectory, { recursive: true, force: true });
		outputDirectory = '';
	}
});

describe('filterGtfsToSeoulAndSeongnam', () => {
	it('keeps routes that stop in both Seoul and Seongnam and drops Seoul-only or Seongnam-only', async () => {
		outputDirectory = await mkdtemp(join(tmpdir(), 'gtfs-seoul-seongnam-'));
		const result = await filterGtfsToSeoulAndSeongnam(FIXTURE_DIR, outputDirectory);

		const routes = await readFile(join(outputDirectory, 'routes.txt'), 'utf8');
		const agency = await readFile(join(outputDirectory, 'agency.txt'), 'utf8').catch(() => '');

		expect(routes).toContain('146');
		expect(routes).toContain('2호선');
		expect(routes).toContain('8호선');
		expect(routes).not.toContain('WRONG');
		expect(result.routes).toBe(5);
		expect(agency).toBe('');
	});
});

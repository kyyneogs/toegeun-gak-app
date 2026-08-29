import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStopTimesForTrips, type LoadedStopTime } from '$lib/adapters/gtfs/gtfs-stop-times';
import { describe, expect, it } from 'vitest';

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/simple/stop_times.txt');

describe('loadStopTimesForTrips', () => {
	it('loads only the requested trip rows', async () => {
		const into = new Map<string, LoadedStopTime[]>();
		await loadStopTimesForTrips(FIXTURE, new Set(['146_B', '5002_A']), into);

		expect(into.has('146_B')).toBe(true);
		expect(into.has('5002_A')).toBe(true);
		expect(into.has('146_A')).toBe(false);
		expect(into.get('146_B')?.some((point) => point.stopId === 'STOP_G')).toBe(true);
	});
});

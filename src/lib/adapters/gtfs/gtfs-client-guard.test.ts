import { describe, expect, it } from 'vitest';

describe('gtfs client guard', () => {
	it('loads on the server without throwing', async () => {
		await expect(import('$lib/adapters/gtfs/gtfs-client-guard')).resolves.toBeTruthy();
	});
});

import { getVapidKeys } from '$lib/server/vapid';
import { describe, expect, it } from 'vitest';

describe('vapid keys', () => {
	it('generates a development key pair when env keys are missing', () => {
		const keys = getVapidKeys();
		expect(keys).not.toBeNull();
		expect(keys?.publicKey.length).toBeGreaterThan(20);
		expect(keys?.privateKey.length).toBeGreaterThan(20);
	});
});

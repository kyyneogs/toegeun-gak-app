import { isNetworkFailure } from '$lib/utils/network';
import { describe, expect, it } from 'vitest';

describe('isNetworkFailure', () => {
	it('detects nested DNS lookup failures', () => {
		const cause = Object.assign(new TypeError('fetch failed'), {
			cause: Object.assign(new Error('getaddrinfo ENOTFOUND apis.openapi.sk.com'), {
				code: 'ENOTFOUND'
			})
		});

		expect(isNetworkFailure(cause)).toBe(true);
	});

	it('ignores unrelated errors', () => {
		expect(isNetworkFailure(new Error('secret boom'))).toBe(false);
	});
});

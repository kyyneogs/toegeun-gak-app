import { accountIdentityCopy, authProviderFromIdentities } from '$lib/domain/auth/provider';
import { describe, expect, it } from 'vitest';

describe('auth provider', () => {
	it('prefers google then email', () => {
		expect(authProviderFromIdentities([{ provider: 'email' }, { provider: 'google' }])).toBe(
			'google'
		);
		expect(authProviderFromIdentities([])).toBe('email');
	});

	it('shows email when present, otherwise the google account label', () => {
		const labels = { google: 'Google 계정', email: '이메일 계정' };
		expect(accountIdentityCopy('a@b.com', 'google', labels)).toBe('a@b.com');
		expect(accountIdentityCopy(null, 'google', labels)).toBe('Google 계정');
	});
});

export type AuthProvider = 'email' | 'google';

export function authProviderFromIdentities(
	identities: Array<{ provider?: string }> | undefined
): AuthProvider {
	const providers = identities?.map((identity) => identity.provider) ?? [];

	if (providers.includes('google')) {
		return 'google';
	}

	return 'email';
}

export function accountIdentityCopy(
	email: string | null,
	provider: AuthProvider,
	labels: { google: string; email: string }
): string {
	if (email) {
		return email;
	}

	if (provider === 'google') {
		return labels.google;
	}

	return labels.email;
}

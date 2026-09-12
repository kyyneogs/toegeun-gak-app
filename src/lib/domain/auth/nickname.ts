import { AUTH_NICKNAME_MAX_LENGTH, isValidNickname } from '$lib/domain/auth/credentials';

export const FALLBACK_NICKNAME = '퇴근러';

export function nicknameFromAuthMetadata(
	email: string | undefined,
	metadata: Record<string, unknown> | undefined
): string {
	const candidates = [
		stringField(metadata, 'nickname'),
		stringField(metadata, 'full_name'),
		stringField(metadata, 'name'),
		stringField(metadata, 'preferred_username'),
		email?.split('@')[0]
	];

	for (const candidate of candidates) {
		const trimmed = candidate?.trim() ?? '';
		if (!trimmed) {
			continue;
		}

		const clipped = trimmed.slice(0, AUTH_NICKNAME_MAX_LENGTH);
		if (isValidNickname(clipped)) {
			return clipped;
		}
	}

	return FALLBACK_NICKNAME;
}

function stringField(record: Record<string, unknown> | undefined, key: string): string | undefined {
	const value = record?.[key];
	return typeof value === 'string' ? value : undefined;
}

import { json } from '@sveltejs/kit';
import { jsonError } from '$lib/server/json-error';
import { updateUserProfile, userFromCookies } from '$lib/server/auth';

export async function GET({ cookies }) {
	const user = await userFromCookies(cookies);
	return json({ user });
}

export async function PATCH({ request, cookies }) {
	try {
		const current = await userFromCookies(cookies);

		if (!current) {
			return json({ user: null }, { status: 401 });
		}

		const body = asRecord(await request.json());
		const nickname = typeof body.nickname === 'string' ? body.nickname : undefined;
		const rankingOptIn = typeof body.rankingOptIn === 'boolean' ? body.rankingOptIn : undefined;
		const standupLeadMinutes =
			typeof body.standupLeadMinutes === 'number' ? body.standupLeadMinutes : undefined;
		const user = await updateUserProfile(current.id, {
			nickname,
			rankingOptIn,
			standupLeadMinutes
		});
		return json({ user });
	} catch (cause) {
		return jsonError(cause);
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

import { json } from '@sveltejs/kit';
import { destroySession } from '$lib/server/auth';

export async function POST({ cookies }) {
	await destroySession(cookies);
	return json({ ok: true });
}

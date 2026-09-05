import { json } from '@sveltejs/kit';
import { getVapidKeys } from '$lib/server/vapid';

export async function GET() {
	const keys = getVapidKeys();
	return json({ publicKey: keys?.publicKey ?? null });
}

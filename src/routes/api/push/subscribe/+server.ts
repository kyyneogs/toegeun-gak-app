import { json } from '@sveltejs/kit';
import { jsonError } from '$lib/server/json-error';
import { requireUser } from '$lib/server/auth';
import { savePushSubscription } from '$lib/server/push-store';

export async function POST({ request, cookies }) {
	try {
		const user = await requireUser(cookies);
		const body = asRecord(await request.json());
		const endpoint = stringField(body, 'endpoint');
		const p256dh = stringField(body, 'p256dh');
		const auth = stringField(body, 'auth');

		if (!endpoint || !p256dh || !auth) {
			return json({ ok: true });
		}

		await savePushSubscription({ userId: user.id, endpoint, p256dh, auth });
		return json({ ok: true });
	} catch (cause) {
		return jsonError(cause);
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function stringField(record: Record<string, unknown>, key: string): string {
	return typeof record[key] === 'string' ? record[key] : '';
}

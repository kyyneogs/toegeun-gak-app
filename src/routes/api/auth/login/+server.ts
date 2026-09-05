import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { jsonError } from '$lib/server/json-error';
import { authenticateUser, createSession, toPublicUser } from '$lib/server/auth';
import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
	try {
		const body = await request.json();
		const record = asRecord(body);
		const user = await authenticateUser(
			stringField(record, 'email'),
			stringField(record, 'password')
		);
		await createSession(user.id, cookies);
		return json({ user: toPublicUser(user) });
	} catch (cause) {
		if (cause instanceof SyntaxError) {
			return jsonError(new AppError(ERROR_CODES.INVALID_REQUEST));
		}

		return jsonError(cause);
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function stringField(record: Record<string, unknown>, key: string): string {
	return typeof record[key] === 'string' ? record[key] : '';
}

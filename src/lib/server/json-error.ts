import { json } from '@sveltejs/kit';
import { ERROR_CODES, ERROR_USER_MESSAGES, type ErrorCode } from '$lib/constants/errors';
import { isAppError } from '$lib/domain/errors';

export function jsonError(cause: unknown) {
	if (!isAppError(cause)) {
		console.error('Unexpected API error', cause);
		return json(
			{
				code: ERROR_CODES.NETWORK_ERROR,
				message: ERROR_USER_MESSAGES.NETWORK_ERROR
			},
			{ status: 500 }
		);
	}

	return json(
		{
			code: cause.code,
			message: cause.message
		},
		{ status: statusFor(cause.code) }
	);
}

function statusFor(code: ErrorCode): number {
	switch (code) {
		case ERROR_CODES.AUTH_REQUIRED:
		case ERROR_CODES.AUTH_INVALID:
			return 401;
		case ERROR_CODES.AUTH_CONFLICT:
			return 409;
		case ERROR_CODES.INVALID_REQUEST:
			return 400;
		default:
			return 400;
	}
}

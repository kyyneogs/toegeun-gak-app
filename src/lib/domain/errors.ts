import { ERROR_CODES, ERROR_USER_MESSAGES, type ErrorCode } from '$lib/constants/errors';

export class AppError extends Error {
	readonly code: ErrorCode;
	override readonly cause?: unknown;

	constructor(code: ErrorCode, message = ERROR_USER_MESSAGES[code], cause?: unknown) {
		super(message);
		this.name = 'AppError';
		this.code = code;
		this.cause = cause;
	}
}

export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
	if (isAppError(error)) {
		return error;
	}

	return new AppError(ERROR_CODES.NETWORK_ERROR, ERROR_USER_MESSAGES.NETWORK_ERROR, error);
}

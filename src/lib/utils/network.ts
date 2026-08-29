export function isNetworkFailure(cause: unknown): boolean {
	let current: unknown = cause;
	const seen = new Set<unknown>();

	while (current && typeof current === 'object' && !seen.has(current)) {
		seen.add(current);
		const record = current as { code?: unknown; message?: unknown; cause?: unknown };
		const code = typeof record.code === 'string' ? record.code : '';
		const message = typeof record.message === 'string' ? record.message : '';

		if (
			code === 'ENOTFOUND' ||
			code === 'EAI_AGAIN' ||
			code === 'ECONNREFUSED' ||
			code === 'ETIMEDOUT' ||
			code === 'UND_ERR_CONNECT_TIMEOUT'
		) {
			return true;
		}

		if (/fetch failed|ENOTFOUND|getaddrinfo/i.test(message)) {
			return true;
		}

		current = record.cause;
	}

	return false;
}

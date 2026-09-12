import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';

export async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;

	try {
		return await Promise.race([
			work,
			new Promise<T>((_, reject) => {
				timer = setTimeout(() => {
					reject(new AppError(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT));
				}, timeoutMs);
			})
		]);
	} finally {
		if (timer !== undefined) {
			clearTimeout(timer);
		}
	}
}

import { ERROR_CODES } from '$lib/constants/errors';
import { AppError } from '$lib/domain/errors';
import { withTimeout } from '$lib/utils/timeout';
import { describe, expect, it } from 'vitest';

describe('withTimeout', () => {
	it('returns the work when it finishes in time', async () => {
		await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
	});

	it('times out independently of other work', async () => {
		try {
			await withTimeout(new Promise((resolve) => setTimeout(resolve, 200)), 20);
			expect.fail('should throw');
		} catch (error) {
			expect(error).toBeInstanceOf(AppError);
			expect((error as AppError).code).toBe(ERROR_CODES.ROUTE_PROVIDER_TIMEOUT);
		}
	});
});

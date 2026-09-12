import { loginPathWithReturn, safeAuthReturnPath } from '$lib/domain/auth/return-path';
import { describe, expect, it } from 'vitest';

describe('safeAuthReturnPath', () => {
	it('allows app screens and rejects anything else', () => {
		expect(safeAuthReturnPath('/result')).toBe('/result');
		expect(safeAuthReturnPath('/result?x=1')).toBe('/result');
		expect(safeAuthReturnPath('https://evil.example/login')).toBe('/');
		expect(safeAuthReturnPath('/api/auth/me')).toBe('/');
	});

	it('builds a login link that carries the return path', () => {
		expect(loginPathWithReturn('/result')).toBe('/login?next=%2Fresult');
		expect(loginPathWithReturn('/')).toBe('/login');
		expect(safeAuthReturnPath('/auth/reset')).toBe('/auth/reset');
	});
});

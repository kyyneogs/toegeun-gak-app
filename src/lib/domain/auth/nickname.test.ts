import { FALLBACK_NICKNAME, nicknameFromAuthMetadata } from '$lib/domain/auth/nickname';
import { describe, expect, it } from 'vitest';

describe('nicknameFromAuthMetadata', () => {
	it('prefers nickname then name then email local part', () => {
		expect(nicknameFromAuthMetadata('a@b.com', { nickname: '퇴근러' })).toBe('퇴근러');
		expect(nicknameFromAuthMetadata('a@b.com', { full_name: '홍길동' })).toBe('홍길동');
		expect(nicknameFromAuthMetadata('walker@b.com', {})).toBe('walker');
	});

	it('clips to 12 characters and falls back', () => {
		expect(nicknameFromAuthMetadata('a@b.com', { name: 'abcdefghijklmn' })).toBe('abcdefghijkl');
		expect(nicknameFromAuthMetadata('', { nickname: '   ' })).toBe(FALLBACK_NICKNAME);
	});
});

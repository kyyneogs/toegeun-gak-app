import type { StoragePort } from '$lib/ports/storage-port';

export class BrowserStorageAdapter implements StoragePort {
	async get<T>(key: string): Promise<T | null> {
		if (!canUseLocalStorage()) {
			return null;
		}

		const raw = window.localStorage.getItem(key);

		if (raw === null) {
			return null;
		}

		try {
			return JSON.parse(raw) as T;
		} catch (cause) {
			console.error('Failed to parse stored value', { key, cause });
			return null;
		}
	}

	async set<T>(key: string, value: T): Promise<void> {
		if (!canUseLocalStorage()) {
			return;
		}

		window.localStorage.setItem(key, JSON.stringify(value));
	}

	async remove(key: string): Promise<void> {
		if (!canUseLocalStorage()) {
			return;
		}

		window.localStorage.removeItem(key);
	}
}

function canUseLocalStorage(): boolean {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

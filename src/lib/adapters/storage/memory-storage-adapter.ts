import type { StoragePort } from '$lib/ports/storage-port';

export class MemoryStorageAdapter implements StoragePort {
	private readonly store = new Map<string, string>();

	async get<T>(key: string): Promise<T | null> {
		const raw = this.store.get(key);

		if (raw === undefined) {
			return null;
		}

		return JSON.parse(raw) as T;
	}

	async set<T>(key: string, value: T): Promise<void> {
		this.store.set(key, JSON.stringify(value));
	}

	async remove(key: string): Promise<void> {
		this.store.delete(key);
	}
}

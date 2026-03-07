export class TtlLruCache<T> {
	private readonly cache = new Map<string, { expiresAt: number; data: T }>();
	private readonly ttlMs: number;
	private readonly maxEntries: number;

	constructor(ttlMs: number, maxEntries: number) {
		this.ttlMs = ttlMs;
		this.maxEntries = maxEntries;
	}

	get(key: string): T | undefined {
		const now = Date.now();
		const entry = this.cache.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= now) {
			this.cache.delete(key);
			return undefined;
		}
		this.cache.delete(key);
		this.cache.set(key, entry);
		return entry.data;
	}

	set(key: string, data: T): void {
		const now = Date.now();
		this.prune(now);
		this.cache.set(key, { expiresAt: now + this.ttlMs, data });
	}

	private prune(now: number): void {
		for (const [key, entry] of this.cache.entries()) {
			if (entry.expiresAt <= now) {
				this.cache.delete(key);
			}
		}
		while (this.cache.size >= this.maxEntries) {
			const oldest = this.cache.keys().next().value as string | undefined;
			if (!oldest) break;
			this.cache.delete(oldest);
		}
	}
}

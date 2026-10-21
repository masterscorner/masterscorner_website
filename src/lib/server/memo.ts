// Small in-memory cache for public data that changes rarely (activity list, category counts).
// Each Cloudflare Worker instance keeps its own copy for a short time; nothing private is stored here.
const store = new Map<string, { until: number; value: Promise<unknown> }>();

export function memo<T>(key: string, seconds: number, load: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const hit = store.get(key);
	if (hit && hit.until > now) return hit.value as Promise<T>;
	const value = load();
	store.set(key, { until: now + seconds * 1000, value });
	value.catch(() => store.delete(key));
	if (store.size > 500) store.clear();
	return value;
}

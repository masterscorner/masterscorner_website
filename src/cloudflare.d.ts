// Minimal types for the Cloudflare Workers runtime module (only what the app uses).
declare module 'cloudflare:workers' {
	export const env: Record<string, unknown>;
	export function waitUntil(promise: Promise<unknown>): void;
}

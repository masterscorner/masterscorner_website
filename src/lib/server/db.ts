import { dev } from '$app/env';
import { DATABASE_URL } from '$app/env/private';
import { connect, type Connection } from './db-core.ts';

// Kept on globalThis so a code reload in development reuses the one local connection.
const g = globalThis as { __mcDevConnection?: Connection };

/**
 * Development: one shared connection (the local database accepts one at a time).
 * Production on Cloudflare Workers: a fresh client per request through Hyperdrive,
 * because Workers cannot reuse network connections across requests.
 */
export async function openDb(): Promise<Connection> {
	if (dev) {
		g.__mcDevConnection ??= connect(DATABASE_URL, 1);
		return { db: g.__mcDevConnection.db, end: async () => {} };
	}
	let url = DATABASE_URL;
	let waitUntil: ((p: Promise<unknown>) => void) | undefined;
	try {
		const cf = await import(/* @vite-ignore */ 'cloudflare:workers');
		const hyperdrive = (cf.env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE;
		if (hyperdrive) url = hyperdrive.connectionString;
		waitUntil = cf.waitUntil;
	} catch {
		// Not running on Workers (for example `vite preview`): use DATABASE_URL.
	}
	const conn = connect(url, 3);
	return {
		db: conn.db,
		// Close after the response is sent, without making the visitor wait.
		end: async () => {
			const closing = conn.end();
			if (waitUntil) waitUntil(closing);
			else await closing;
		}
	};
}

/** The local PGlite socket can lose sync after a failed query; start a fresh connection. */
export async function resetDevConnection() {
	if (!dev || !g.__mcDevConnection) return;
	const old = g.__mcDevConnection;
	g.__mcDevConnection = undefined;
	await old.end().catch(() => {});
}

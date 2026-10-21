import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { authFor } from '#lib/server/auth.ts';
import { openDb, resetDevConnection } from '#lib/server/db.ts';
import { ensurePerson, type Me } from '#lib/server/services/people.ts';

const securityHeaders: Record<string, string> = {
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'x-frame-options': 'DENY',
	'permissions-policy': 'camera=(self), geolocation=(self), microphone=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	const conn = await openDb();
	const auth = authFor(conn.db);
	event.locals.db = conn.db;
	event.locals.auth = auth;

	let cached: Promise<Me | null> | undefined;
	event.locals.me = () =>
		(cached ??= (async () => {
			const session = await auth.api.getSession({ headers: event.request.headers });
			if (!session) return null;
			return ensurePerson(conn.db, session.user as never);
		})());

	try {
		const response = await svelteKitHandler({ event, resolve, auth, building });
		for (const [k, v] of Object.entries(securityHeaders)) {
			if (!response.headers.has(k)) response.headers.set(k, v);
		}
		return response;
	} catch (err) {
		await resetDevConnection();
		throw err;
	} finally {
		await conn.end();
	}
};

export const handleError: HandleServerError = async (caught) => {
	if (dev) await resetDevConnection();
	// Errors thrown with error() keep their own message; anything unexpected gets a plain one.
	if (caught.kind === 'unknown') {
		console.error(caught.error);
		// Local only: new code but the database was not updated yet.
		if (dev && /(column|relation|function) .* does not exist/.test(String((caught.error as Error)?.message))) {
			return { status: 500, message: 'The local database needs an update. Close the website window and run 3-prepare-database.bat (or start-all.bat), then try again.' };
		}
		return { status: 500, message: 'Something went wrong. Please try again.' };
	}
};

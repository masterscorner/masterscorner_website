import { fail } from '@sveltejs/kit';
import { resetDevConnection } from './db.ts';

export const str = (d: FormData, k: string) => String(d.get(k) ?? '').trim();
export const on = (d: FormData, k: string) => d.get(k) === 'on' || d.get(k) === '1';

/** Runs a save; on any database error returns a friendly message instead of a crash page. */
export async function attempt<T>(fn: () => Promise<T>, okMessage: string, errorMessage = 'Could not save. Please try again.') {
	try {
		await fn();
		return { message: okMessage };
	} catch (err) {
		await resetDevConnection();
		console.error(err);
		return fail(400, { error: errorMessage });
	}
}

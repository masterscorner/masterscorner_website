import { inject } from 'vitest';
import { connect, type Connection } from '../src/lib/server/db-core.ts';

let conn: Connection | undefined;

export function db() {
	conn ??= connect(inject('databaseUrl'), 1);
	return conn.db;
}

export async function closeDb() {
	await conn?.end();
	conn = undefined;
}

/**
 * Expects the database to refuse. Afterwards the test connection is reopened, because the
 * local PGlite socket server can lose protocol sync after an error (not an issue on real Postgres).
 */
export async function denied(work: Promise<unknown>, pattern?: RegExp) {
	let error: unknown;
	try {
		await work;
	} catch (err) {
		error = err;
	}
	await closeDb();
	if (!error) throw new Error('Expected the database to refuse, but it succeeded');
	if (pattern && !pattern.test(String((error as Error).message))) {
		throw new Error(`Refused with "${(error as Error).message}", expected ${pattern}`);
	}
}

let counter = 0;

/** A signed-up adult (as if they had logged in and finished the welcome step). */
export async function makeAdult(name: string): Promise<{ id: string; phone: string }> {
	counter += 1;
	const phone = `+9198${String(Date.now()).slice(-6)}${String(counter).padStart(2, '0')}`;
	const row = await db()
		.insertInto('persons')
		.values({ user_id: `user-${name}-${counter}-${Date.now()}`, display_name: name, phone_e164: phone, birth_date: '1990-01-01' })
		.returning('id')
		.executeTakeFirstOrThrow();
	return { id: row.id, phone };
}

export const sampleClass = (name: string, activityIds: number[]) => ({
	name,
	activityIds,
	city: 'Madurai',
	state: 'Tamil Nadu',
	addressLine: '12 Gandhi Street',
	locality: 'Anna Nagar',
	lat: 9.93,
	lng: 78.12,
	precise: true,
	whatsapp: '+919876543210',
	showWhatsapp: true,
	phone: '+919876543211',
	showPhone: false,
	teachingLanguages: ['Tamil', 'English'],
	ageGroups: ['kids', 'adults'],
	upiId: 'teacher@okaxis',
	batch: { name: 'Evening kids', days: [1, 3, 5], start: '17:00', end: '18:00', feePaise: 80000, feePeriod: 'month' as const }
});

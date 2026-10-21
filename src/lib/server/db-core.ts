// Database connection and the per-request "act as this person" wrapper. No SvelteKit imports (used by tests).
import { Kysely, sql, type Transaction } from 'kysely';
import { PostgresJSDialect } from 'kysely-postgres-js';
import postgres from 'postgres';
import type { Database } from './db-types.ts';

export type DB = Kysely<Database>;
export type Tx = Transaction<Database>;

export interface Connection {
	db: DB;
	end: () => Promise<void>;
}

export function connect(url: string, max = 1): Connection {
	const pg = postgres(url, { max, onnotice: () => {}, idle_timeout: 20, connect_timeout: 10 });
	const db = new Kysely<Database>({ dialect: new PostgresJSDialect({ postgres: pg }) });
	return { db, end: () => pg.end({ timeout: 5 }) };
}

/**
 * Run work as a signed-in person (or as a visitor when personId is null).
 * The transaction drops to the unprivileged app_user role, so row-level security applies.
 */
export function asPerson<T>(db: DB, personId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
	return db.transaction().execute(async (tx) => {
		await sql`select set_config('app.person_id', ${personId ?? ''}, true)`.execute(tx);
		await sql`set local role app_user`.execute(tx);
		return fn(tx);
	});
}

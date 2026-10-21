import { sql } from 'kysely';
import type { DB } from './db-core.ts';

/** True when allowed. `max` actions per `windowSeconds` for this key. */
export async function allow(db: DB, key: string, max: number, windowSeconds: number): Promise<boolean> {
	const { rows } = await sql<{ ok: boolean }>`select app.rate_limit(${key}, ${max}, ${windowSeconds}) as ok`.execute(db);
	return rows[0]?.ok ?? false;
}

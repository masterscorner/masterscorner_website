// Local Postgres for development and tests: PGlite (Postgres compiled to WebAssembly) with PostGIS.
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { postgis } from '@electric-sql/pglite-postgis';

export async function openPglite(dataDir?: string): Promise<PGlite> {
	const extensions = { postgis, pg_trgm };
	const db = dataDir ? new PGlite(dataDir, { extensions }) : new PGlite({ extensions });
	await db.waitReady;
	return db;
}

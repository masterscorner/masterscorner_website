// npm run db:migrate — applies pending SQL migrations to DATABASE_URL (default: local dev database).
import postgres from 'postgres';
import { migrate } from './migrate-core.ts';
import { loadEnv } from './env.ts';

loadEnv();
const url = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/postgres';

// The local database can take a little while to start (or is still starting in the other window): wait up to 90 seconds.
const local = /127\.0\.0\.1|localhost/.test(url);
for (let i = 0; ; i++) {
	const probe = postgres(url, { max: 1, onnotice: () => {}, connect_timeout: 5 });
	try {
		await probe`select 1`;
		await probe.end();
		break;
	} catch (err) {
		await probe.end({ timeout: 1 }).catch(() => {});
		if (!local || i >= 45) {
			console.error(local ? 'The local database is not running. Open 2-start-database.bat (or start-all.bat) and look for errors in that window.' : String(err));
			process.exit(1);
		}
		if (i === 0) console.log('Waiting for the local database to start…');
		await new Promise((r) => setTimeout(r, 2000));
	}
}
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
	const applied = await migrate({
		query: async (q, params = []) => ({ rows: await sql.unsafe(q, params as any[]) }),
		exec: async (q) => {
			await sql.unsafe(q);
		}
	});
	console.log(applied.length ? `Done: ${applied.length} migration(s).` : 'Database is up to date.');
} finally {
	await sql.end();
}

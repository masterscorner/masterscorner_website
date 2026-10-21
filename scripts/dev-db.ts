// Starts a local Postgres (PGlite + PostGIS) on 127.0.0.1:54329 that survives restarts in ./.data/pg.
// Use: npm run db:dev   (keep it running), then npm run db:migrate and npm run dev in another terminal.
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { openPglite } from './pglite.ts';

const port = Number(process.env.DEV_DB_PORT ?? 54329);
mkdirSync('.data', { recursive: true });

// If the database folder was damaged (for example the window was closed while it was writing),
// keep the old folder aside and start a fresh one. Demo data is added again by the website window.
async function open() {
	try {
		return await openPglite('./.data/pg');
	} catch (err) {
		if (!existsSync('./.data/pg')) throw err;
		const aside = `./.data/pg-damaged-${new Date().toISOString().replace(/[:.]/g, '-')}`;
		renameSync('./.data/pg', aside);
		console.log(`\nThe local database could not start (its files were damaged). It was moved to ${aside} and a fresh one is being made.`);
		console.log('Local test data starts again from the demo data. You can delete that old folder.\n');
		return await openPglite('./.data/pg');
	}
}
const db = await open();
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 1 });
await server.start();
console.log(`Local database ready: postgres://postgres@127.0.0.1:${port}/postgres`);

const stop = async () => {
	await server.stop();
	await db.close();
	process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

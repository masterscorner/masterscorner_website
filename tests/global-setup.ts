// Starts an in-memory Postgres (PGlite + PostGIS) with all migrations for the test run.
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import type { TestProject } from 'vitest/node';
import { migrate } from '../scripts/migrate-core.ts';
import { openPglite } from '../scripts/pglite.ts';

export default async function setup(project: TestProject) {
	const db = await openPglite();
	await migrate(
		{
			query: (q, params) => db.query(q, params),
			exec: async (q) => {
				await db.exec(q);
			}
		},
		'db/migrations',
		() => {}
	);
	const port = 54339;
	const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 1 });
	await server.start();
	project.provide('databaseUrl', `postgres://postgres@127.0.0.1:${port}/postgres`);
	return async () => {
		await server.stop();
		await db.close();
	};
}

declare module 'vitest' {
	export interface ProvidedContext {
		databaseUrl: string;
	}
}

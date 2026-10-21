// Applies db/migrations/*.sql in name order, once each, recording them in public.schema_migrations.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SqlRunner {
	query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
	exec(sql: string): Promise<void>;
}

export async function migrate(db: SqlRunner, dir = 'db/migrations', log = console.log): Promise<string[]> {
	await db.exec(`create table if not exists public.schema_migrations (
		name text primary key,
		applied_at timestamptz not null default now()
	)`);
	const done = new Set((await db.query('select name from public.schema_migrations')).rows.map((r) => r.name));
	const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
	const applied: string[] = [];
	for (const file of files) {
		if (done.has(file)) continue;
		const sql = readFileSync(join(dir, file), 'utf8');
		await db.exec('begin');
		try {
			await db.exec(sql);
			await db.query('insert into public.schema_migrations (name) values ($1)', [file]);
			await db.exec('commit');
		} catch (err) {
			await db.exec('rollback');
			throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
		}
		applied.push(file);
		log(`applied ${file}`);
	}
	return applied;
}

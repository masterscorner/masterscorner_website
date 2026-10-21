// Level lists (belts, grades) and level awards (gradings) for a class.
import { sql } from 'kysely';
import { asPerson, type DB } from '../db-core.ts';

export interface Level {
	id: number;
	position: number;
	name: string;
	color: string | null;
}

export interface LevelsPage {
	systemId: number | null;
	systemName: string | null;
	ownSystem: boolean;
	levels: Level[];
	templates: { id: number; name: string; levels: Level[] }[];
	students: {
		person_id: string;
		display_name: string;
		level_id: number | null;
		level_name: string | null;
		level_color: string | null;
		awarded_on: string | null;
		classes_since: number;
		history: { id: string; level_name: string; awarded_on: string; revoked: boolean }[];
	}[];
}

export function levelsPage(db: DB, personId: string, orgId: string): Promise<LevelsPage> {
	return asPerson(db, personId, async (tx) => {
		const org = await tx
			.selectFrom('orgs as o')
			.leftJoin('level_systems as s', 's.id', 'o.level_system_id')
			.select(['o.level_system_id', 's.name', 's.org_id'])
			.where('o.id', '=', orgId)
			.executeTakeFirstOrThrow();
		const levels = org.level_system_id
			? await tx.selectFrom('levels').select(['id', 'position', 'name', 'color']).where('system_id', '=', org.level_system_id).orderBy('position').execute()
			: [];
		const { rows: templates } = await sql<LevelsPage['templates'][number]>`
			select s.id, s.name, coalesce(json_agg(json_build_object('id', l.id, 'position', l.position, 'name', l.name, 'color', l.color) order by l.position), '[]') as levels
			from level_systems s join levels l on l.system_id = s.id
			where s.org_id is null group by s.id order by s.id
		`.execute(tx);
		const { rows: students } = await sql<LevelsPage['students'][number]>`
			select p.id as person_id, p.display_name,
				cur.level_id, cur.level_name, cur.level_color, cur.awarded_on,
				(select count(*)::int from attendance a join class_sessions s on s.id = a.session_id
					where a.person_id = p.id and a.org_id = ${orgId} and a.status in ('present', 'late')
						and (cur.awarded_on is null or s.on_date > cur.awarded_on::date)) as classes_since,
				coalesce((select json_agg(json_build_object('id', g.id, 'level_name', l.name, 'awarded_on', to_char(g.awarded_on, 'YYYY-MM-DD'), 'revoked', g.revoked_at is not null) order by g.awarded_on desc, g.created_at desc)
					from grade_awards g join levels l on l.id = g.level_id where g.person_id = p.id and g.org_id = ${orgId}), '[]') as history
			from (select distinct e.person_id from enrolments e where e.org_id = ${orgId} and e.status in ('active', 'trial')) en
			join persons p on p.id = en.person_id
			left join lateral (
				select g.level_id, l.name as level_name, l.color as level_color, to_char(g.awarded_on, 'YYYY-MM-DD') as awarded_on
				from grade_awards g join levels l on l.id = g.level_id
				where g.person_id = p.id and g.org_id = ${orgId} and g.revoked_at is null
				order by g.awarded_on desc, l.position desc limit 1
			) cur on true
			order by p.display_name
		`.execute(tx);
		return {
			systemId: org.level_system_id,
			systemName: org.name,
			ownSystem: org.org_id === orgId,
			levels,
			templates,
			students
		};
	});
}

/** Use a ready-made list (karate belts…) or none. */
export function useTemplate(db: DB, personId: string, orgId: string, templateId: number | null) {
	return asPerson(db, personId, async (tx) => {
		if (templateId != null) {
			const t = await tx.selectFrom('level_systems').select('id').where('id', '=', templateId).where('org_id', 'is', null).executeTakeFirst();
			if (!t) throw new Error('Not found');
		}
		await tx.updateTable('orgs').set({ level_system_id: templateId }).where('id', '=', orgId).execute();
	});
}

/** Creates the class's own list (or replaces the names/colours of its own list, keeping the same levels in order). */
export function saveOwnLevels(db: DB, personId: string, orgId: string, name: string, items: { name: string; color: string | null }[]) {
	return asPerson(db, personId, async (tx) => {
		const org = await tx
			.selectFrom('orgs as o')
			.leftJoin('level_systems as s', 's.id', 'o.level_system_id')
			.select(['o.level_system_id', 's.org_id'])
			.where('o.id', '=', orgId)
			.executeTakeFirstOrThrow();
		let systemId = org.org_id === orgId ? org.level_system_id : null;
		if (!systemId) {
			const created = await tx.insertInto('level_systems').values({ org_id: orgId, name }).returning('id').executeTakeFirstOrThrow();
			systemId = created.id;
			await tx.updateTable('orgs').set({ level_system_id: systemId }).where('id', '=', orgId).execute();
		} else {
			await tx.updateTable('level_systems').set({ name }).where('id', '=', systemId).execute();
		}
		const existing = await tx.selectFrom('levels').select(['id', 'position']).where('system_id', '=', systemId).orderBy('position').execute();
		for (const [i, item] of items.entries()) {
			const row = existing.find((e) => e.position === i);
			if (row) await tx.updateTable('levels').set({ name: item.name, color: item.color }).where('id', '=', row.id).execute();
			else await tx.insertInto('levels').values({ system_id: systemId, position: i, name: item.name, color: item.color }).execute();
		}
		// Levels beyond the new list are removed only if nobody holds them.
		for (const e of existing.filter((e) => e.position >= items.length)) {
			const used = await tx.selectFrom('grade_awards').select('id').where('level_id', '=', e.id).executeTakeFirst();
			if (!used) await tx.deleteFrom('levels').where('id', '=', e.id).execute();
		}
	});
}

/** Copies a template into the class's own editable list. */
export function copyTemplate(db: DB, personId: string, orgId: string, templateId: number) {
	return asPerson(db, personId, async (tx) => {
		const t = await tx.selectFrom('level_systems').select(['id', 'name']).where('id', '=', templateId).where('org_id', 'is', null).executeTakeFirstOrThrow();
		const lv = await tx.selectFrom('levels').select(['name', 'color', 'position']).where('system_id', '=', t.id).orderBy('position').execute();
		const s = await tx.insertInto('level_systems').values({ org_id: orgId, name: t.name }).returning('id').executeTakeFirstOrThrow();
		if (lv.length) await tx.insertInto('levels').values(lv.map((l) => ({ system_id: s.id, position: l.position, name: l.name, color: l.color }))).execute();
		await tx.updateTable('orgs').set({ level_system_id: s.id }).where('id', '=', orgId).execute();
	});
}

export function awardLevel(db: DB, personId: string, orgId: string, studentId: string, levelId: number, on: string, note: string | null) {
	return asPerson(db, personId, async (tx) => {
		const ok = await tx
			.selectFrom('levels as l')
			.innerJoin('orgs as o', 'o.level_system_id', 'l.system_id')
			.select('l.id')
			.where('o.id', '=', orgId)
			.where('l.id', '=', levelId)
			.executeTakeFirst();
		if (!ok) throw new Error('Level not in this class');
		await tx.insertInto('grade_awards').values({ org_id: orgId, person_id: studentId, level_id: levelId, awarded_on: on, awarded_by: personId, note }).execute();
	});
}

export function revokeAward(db: DB, personId: string, orgId: string, awardId: string) {
	return asPerson(db, personId, (tx) =>
		tx.updateTable('grade_awards').set({ revoked_at: new Date(), revoked_by: personId }).where('id', '=', awardId).where('org_id', '=', orgId).where('revoked_at', 'is', null).execute()
	);
}

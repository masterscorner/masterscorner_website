import { sql } from 'kysely';
import { asPerson, type DB } from '../db-core.ts';
import type { AttendanceStatus } from '../db-types.ts';

export interface TodayBatch {
	batch_id: string;
	batch_name: string;
	start_time: string;
	end_time: string;
	session_id: string;
	students: number;
	present: number;
	marked: number;
}

/** Day of week (0 = Sunday) and ISO date for a moment in the class's time zone. */
export function localDay(timeZone: string, at = new Date()): { date: string; dow: number } {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		weekday: 'short'
	}).formatToParts(at);
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
	const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
	return { date: `${get('year')}-${get('month')}-${get('day')}`, dow };
}

/** Batches running on `date`, creating their session rows on first look. */
export function batchesOn(db: DB, personId: string, orgId: string, date: string, dow: number): Promise<TodayBatch[]> {
	return asPerson(db, personId, async (tx) => {
		await sql`
			insert into class_sessions (org_id, batch_id, on_date)
			select b.org_id, b.id, ${date}::date from batches b
			where b.org_id = ${orgId} and b.active and ${dow}::smallint = any (b.days)
			on conflict (batch_id, on_date) do nothing
		`.execute(tx);
		const { rows } = await sql<TodayBatch>`
			select b.id as batch_id, b.name as batch_name, to_char(b.start_time, 'HH24:MI') as start_time,
				to_char(b.end_time, 'HH24:MI') as end_time, s.id as session_id,
				(select count(*)::int from enrolments e where e.batch_id = b.id and e.status in ('active', 'trial')) as students,
				(select count(*)::int from attendance a where a.session_id = s.id and a.status in ('present', 'late')) as present,
				(select count(*)::int from attendance a where a.session_id = s.id) as marked
			from batches b
			join class_sessions s on s.batch_id = b.id and s.on_date = ${date}::date
			where b.org_id = ${orgId} and b.active
			order by b.start_time
		`.execute(tx);
		return rows;
	});
}

export interface RollEntry {
	person_id: string;
	display_name: string;
	status: AttendanceStatus | null;
}

export interface RollCall {
	session_id: string;
	on_date: string;
	batch_id: string;
	batch_name: string;
	entries: RollEntry[];
}

export function rollCall(db: DB, personId: string, orgId: string, sessionId: string): Promise<RollCall | null> {
	return asPerson(db, personId, async (tx) => {
		const session = await tx
			.selectFrom('class_sessions as s')
			.innerJoin('batches as b', 'b.id', 's.batch_id')
			.select(['s.id as session_id', sql<string>`to_char(s.on_date, 'YYYY-MM-DD')`.as('on_date'), 'b.id as batch_id', 'b.name as batch_name'])
			.where('s.id', '=', sessionId)
			.where('s.org_id', '=', orgId)
			.executeTakeFirst();
		if (!session) return null;
		const entries = await tx
			.selectFrom('enrolments as e')
			.innerJoin('persons as p', 'p.id', 'e.person_id')
			.leftJoin('attendance as a', (j) => j.onRef('a.person_id', '=', 'p.id').on('a.session_id', '=', sessionId))
			.select(['p.id as person_id', 'p.display_name', 'a.status'])
			.where('e.batch_id', '=', session.batch_id)
			.where('e.status', 'in', ['active', 'trial'])
			.orderBy('p.display_name')
			.execute();
		return { ...session, entries };
	});
}

export interface MarkInput {
	id: string; // client-generated, so a resent offline queue is harmless
	personId: string;
	status: AttendanceStatus;
}

/** Saves marks for one session. Re-sending the same marks changes nothing. */
export function markAttendance(db: DB, personId: string, orgId: string, sessionId: string, marks: MarkInput[]) {
	if (!marks.length) return Promise.resolve(0);
	return asPerson(db, personId, async (tx) => {
		const allowed = await tx
			.selectFrom('enrolments as e')
			.innerJoin('class_sessions as s', 's.batch_id', 'e.batch_id')
			.select('e.person_id')
			.where('s.id', '=', sessionId)
			.where('s.org_id', '=', orgId)
			.where('e.status', 'in', ['active', 'trial'])
			.execute();
		const ok = new Set(allowed.map((r) => r.person_id));
		const rows = marks
			.filter((m) => ok.has(m.personId))
			.map((m) => ({ id: m.id, org_id: orgId, session_id: sessionId, person_id: m.personId, status: m.status, marked_by: personId }));
		if (!rows.length) return 0;
		await tx
			.insertInto('attendance')
			.values(rows)
			.onConflict((oc) =>
				oc.columns(['session_id', 'person_id']).doUpdateSet((eb) => ({
					status: eb.ref('excluded.status'),
					marked_by: eb.ref('excluded.marked_by'),
					marked_at: sql`now()`
				}))
			)
			.execute();
		return rows.length;
	});
}

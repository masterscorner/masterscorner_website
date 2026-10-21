// What a student (or their parent) sees: their classes, attendance, fees and levels.
import { sql } from 'kysely';
import { asPerson, type DB } from '../db-core.ts';

export interface LearningRow {
	person_id: string;
	person_name: string;
	is_me: boolean;
	org_id: string;
	org_name: string;
	org_slug: string;
	batch_name: string;
	status: string;
	due_count: number;
}

/** Classes the signed-in person, or any of their confirmed children, belong to. */
export function myLearning(db: DB, personId: string): Promise<LearningRow[]> {
	return asPerson(db, personId, async (tx) => {
		const { rows } = await sql<LearningRow>`
			select p.id as person_id, p.display_name as person_name, p.id = app.person_id() as is_me,
				o.id as org_id, o.name as org_name, o.slug as org_slug, b.name as batch_name, e.status,
				(select count(*)::int from invoices i where i.person_id = p.id and i.org_id = o.id and i.status = 'due') as due_count
			from enrolments e
			join persons p on p.id = e.person_id
			join orgs o on o.id = e.org_id
			join batches b on b.id = e.batch_id
			where (e.person_id = app.person_id() or app.is_guardian(e.person_id))
				and e.status in ('active', 'trial', 'paused')
			order by p.id = app.person_id() desc, p.display_name, o.name
		`.execute(tx);
		return rows;
	});
}

export interface LearnerView {
	person: { id: string; name: string; isMe: boolean };
	org: { id: string; name: string; slug: string; upi_id: string | null; whatsapp_e164: string | null; timezone: string };
	batches: { id: string; name: string; days: number[]; start_time: string; end_time: string; online_url: string | null }[];
	attendance: { on_date: string; status: string }[];
	invoices: { id: string; period_label: string; amount_paise: number; status: string; due_on: string; claimed: boolean }[];
	levels: { name: string; color: string | null; awarded_on: string }[];
	canReview: boolean;
	myReview: { rating: number; body: string | null } | null;
}

export function learnerView(db: DB, viewerId: string, learnerId: string, orgId: string, since: string): Promise<LearnerView | null> {
	return asPerson(db, viewerId, async (tx) => {
		const { rows: who } = await sql<{ id: string; name: string; allowed: boolean }>`
			select p.id, p.display_name as name, (p.id = app.person_id() or app.is_guardian(p.id)) as allowed
			from persons p where p.id = ${learnerId}
		`.execute(tx);
		if (!who[0]?.allowed) return null;

		const org = await tx
			.selectFrom('orgs')
			.select(['id', 'name', 'slug', 'upi_id', 'timezone', sql<string | null>`case when show_whatsapp then whatsapp_e164 end`.as('whatsapp_e164')])
			.where('id', '=', orgId)
			.executeTakeFirst();
		if (!org) return null;

		const batches = await tx
			.selectFrom('enrolments as e')
			.innerJoin('batches as b', 'b.id', 'e.batch_id')
			.select(['b.id', 'b.name', 'b.days', sql<string>`to_char(b.start_time, 'HH24:MI')`.as('start_time'), sql<string>`to_char(b.end_time, 'HH24:MI')`.as('end_time'), 'b.online_url'])
			.where('e.person_id', '=', learnerId)
			.where('e.org_id', '=', orgId)
			.where('e.status', 'in', ['active', 'trial', 'paused'])
			.execute();
		if (!batches.length) return null;

		const { rows: attendance } = await sql<{ on_date: string; status: string }>`
			select to_char(s.on_date, 'YYYY-MM-DD') as on_date, a.status
			from attendance a join class_sessions s on s.id = a.session_id
			where a.person_id = ${learnerId} and a.org_id = ${orgId} and s.on_date >= ${since}::date
			order by s.on_date
		`.execute(tx);

		const { rows: invoices } = await sql<LearnerView['invoices'][number]>`
			select i.id, i.period_label, i.amount_paise, i.status, to_char(i.due_on, 'YYYY-MM-DD') as due_on,
				exists (select 1 from payment_claims c where c.invoice_id = i.id and c.status = 'pending') as claimed
			from invoices i where i.person_id = ${learnerId} and i.org_id = ${orgId} and i.status in ('due', 'paid')
			order by i.period_start desc limit 12
		`.execute(tx);

		const { rows: levels } = await sql<LearnerView['levels'][number]>`
			select l.name, l.color, to_char(g.awarded_on, 'YYYY-MM-DD') as awarded_on
			from grade_awards g join levels l on l.id = g.level_id
			where g.person_id = ${learnerId} and g.org_id = ${orgId} and g.revoked_at is null
			order by g.awarded_on desc, l.position desc
		`.execute(tx);

		const { rows: rv } = await sql<{ can: boolean }>`
			select app.has_attended(${orgId}::uuid) and not app.is_staff(${orgId}::uuid) as can
		`.execute(tx);
		const myReview = await tx
			.selectFrom('reviews')
			.select(['rating', 'body'])
			.where('org_id', '=', orgId)
			.where('author_id', '=', viewerId)
			.executeTakeFirst();

		return {
			person: { id: who[0].id, name: who[0].name, isMe: who[0].id === viewerId },
			org,
			batches,
			attendance,
			invoices,
			levels,
			canReview: Boolean(rv[0]?.can),
			myReview: myReview ?? null
		};
	});
}

/** Writes or updates the viewer's review. The database only allows it after attending. */
export function saveReview(db: DB, personId: string, orgId: string, rating: number, body: string | null) {
	return asPerson(db, personId, async (tx) => {
		const existing = await tx.selectFrom('reviews').select('id').where('org_id', '=', orgId).where('author_id', '=', personId).executeTakeFirst();
		if (existing) {
			await tx.updateTable('reviews').set({ rating, body }).where('id', '=', existing.id).execute();
		} else {
			await tx.insertInto('reviews').values({ org_id: orgId, author_id: personId, rating, body }).execute();
		}
	});
}

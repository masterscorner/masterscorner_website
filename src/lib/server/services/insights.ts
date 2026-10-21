// Class insights: attendance trends, batches, fees, joiners and leavers, who needs attention.
// Computed live from the class's own rows (fine for one class; roll-ups can come later).
import { sql } from 'kysely';
import { asPerson, type DB } from '../db-core.ts';

import { READY_AFTER } from '../../insights-shared.ts';

export interface Insights {
	students: { active: number; trial: number; paused: number; children: number; adults: number };
	weeks: { week: string; came: number; marked: number }[];
	batches: { name: string; came: number; marked: number }[];
	months: { month: string; joined: number; left: number }[];
	fees: { month: string; due: number; collected: number }[] | null;
	enquiriesNew: number;
	atRisk: { person_id: string; display_name: string; last_came: string | null }[];
	ready: { person_id: string; display_name: string; level_name: string | null; classes_since: number }[];
	hasLevels: boolean;
}

export function classInsights(db: DB, personId: string, orgId: string, today: string, withFees: boolean): Promise<Insights> {
	return asPerson(db, personId, async (tx) => {
		const { rows: [students] } = await sql<Insights['students']>`
			with people as (
				select e.person_id,
					bool_or(e.status = 'active') as active, bool_or(e.status = 'trial') as trial, bool_and(e.status = 'paused') as paused
				from enrolments e where e.org_id = ${orgId} and e.status in ('active', 'trial', 'paused') group by e.person_id
			)
			select count(*) filter (where x.active)::int as active,
				count(*) filter (where x.trial and not x.active)::int as trial,
				count(*) filter (where x.paused)::int as paused,
				count(*) filter (where not x.paused and p.is_minor)::int as children,
				count(*) filter (where not x.paused and not p.is_minor)::int as adults
			from people x join persons p on p.id = x.person_id
		`.execute(tx);

		const { rows: weeks } = await sql<Insights['weeks'][number]>`
			with w as (
				select generate_series(date_trunc('week', ${today}::date) - interval '11 weeks', date_trunc('week', ${today}::date), interval '1 week')::date as wk
			)
			select to_char(w.wk, 'YYYY-MM-DD') as week,
				count(a.id) filter (where a.status in ('present', 'late'))::int as came,
				count(a.id) filter (where a.status in ('present', 'late', 'absent'))::int as marked
			from w
			left join class_sessions s on s.org_id = ${orgId} and s.status = 'scheduled' and s.on_date >= w.wk and s.on_date < w.wk + 7 and s.on_date <= ${today}::date
			left join attendance a on a.session_id = s.id
			group by w.wk order by w.wk
		`.execute(tx);

		const { rows: batches } = await sql<Insights['batches'][number]>`
			select b.name,
				count(a.id) filter (where a.status in ('present', 'late'))::int as came,
				count(a.id) filter (where a.status in ('present', 'late', 'absent'))::int as marked
			from batches b
			left join class_sessions s on s.batch_id = b.id and s.status = 'scheduled' and s.on_date > ${today}::date - 28 and s.on_date <= ${today}::date
			left join attendance a on a.session_id = s.id
			where b.org_id = ${orgId} and b.active
			group by b.id, b.name order by b.name
		`.execute(tx);

		const { rows: months } = await sql<Insights['months'][number]>`
			with m as (
				select generate_series(date_trunc('month', ${today}::date) - interval '5 months', date_trunc('month', ${today}::date), interval '1 month')::date as mo
			)
			select to_char(m.mo, 'YYYY-MM-DD') as month,
				(select count(distinct e.person_id) from enrolments e where e.org_id = ${orgId} and e.status <> 'pending_consent'
					and e.joined_on >= m.mo and e.joined_on < m.mo + interval '1 month')::int as joined,
				(select count(distinct e.person_id) from enrolments e where e.org_id = ${orgId} and e.status = 'left'
					and e.left_on >= m.mo and e.left_on < m.mo + interval '1 month')::int as left
			from m order by m.mo
		`.execute(tx);

		let fees: Insights['fees'] = null;
		if (withFees) {
			const { rows } = await sql<{ month: string; due: number; collected: number }>`
				with m as (
					select generate_series(date_trunc('month', ${today}::date) - interval '5 months', date_trunc('month', ${today}::date), interval '1 month')::date as mo
				)
				select to_char(m.mo, 'YYYY-MM-DD') as month,
					coalesce(sum(i.amount_paise) filter (where i.status in ('due', 'paid')), 0)::bigint as due,
					coalesce(sum(i.amount_paise) filter (where i.status = 'paid'), 0)::bigint as collected
				from m left join invoices i on i.org_id = ${orgId} and i.period_start = m.mo
				group by m.mo order by m.mo
			`.execute(tx);
			fees = rows.map((r) => ({ month: r.month, due: Number(r.due), collected: Number(r.collected) }));
		}

		const { rows: [enq] } = await sql<{ n: number }>`select count(*)::int as n from enquiries where org_id = ${orgId} and status = 'new'`.execute(tx);

		// Missed the last 3 classes they were marked for (excused does not count).
		const { rows: atRisk } = await sql<Insights['atRisk'][number]>`
			with r as (
				select a.person_id, a.status, s.on_date,
					row_number() over (partition by a.person_id order by s.on_date desc) as rn
				from attendance a join class_sessions s on s.id = a.session_id
				where a.org_id = ${orgId} and a.status in ('present', 'late', 'absent')
			)
			select p.id as person_id, p.display_name,
				(select to_char(max(r2.on_date), 'YYYY-MM-DD') from r r2 where r2.person_id = p.id and r2.status in ('present', 'late')) as last_came
			from r join persons p on p.id = r.person_id
			where r.rn <= 3
				and exists (select 1 from enrolments e where e.org_id = ${orgId} and e.person_id = p.id and e.status in ('active', 'trial'))
			group by p.id, p.display_name
			having count(*) = 3 and bool_and(r.status = 'absent')
			order by p.display_name limit 20
		`.execute(tx);

		const { rows: [lv] } = await sql<{ has: boolean }>`select level_system_id is not null as has from orgs where id = ${orgId}`.execute(tx);
		let ready: Insights['ready'] = [];
		if (lv?.has) {
			const { rows } = await sql<Insights['ready'][number]>`
				select * from (
					select p.id as person_id, p.display_name, cur.level_name,
						(select count(*)::int from attendance a join class_sessions s on s.id = a.session_id
							where a.person_id = p.id and a.org_id = ${orgId} and a.status in ('present', 'late')
								and (cur.awarded_on is null or s.on_date > cur.awarded_on)) as classes_since
					from (select distinct person_id from enrolments where org_id = ${orgId} and status = 'active') en
					join persons p on p.id = en.person_id
					left join lateral (
						select l.name as level_name, g.awarded_on from grade_awards g join levels l on l.id = g.level_id
						where g.person_id = p.id and g.org_id = ${orgId} and g.revoked_at is null
						order by g.awarded_on desc, l.position desc limit 1
					) cur on true
				) x where x.classes_since >= ${READY_AFTER}
				order by x.classes_since desc limit 10
			`.execute(tx);
			ready = rows;
		}

		return {
			students: students ?? { active: 0, trial: 0, paused: 0, children: 0, adults: 0 },
			weeks,
			batches,
			months,
			fees,
			enquiriesNew: enq?.n ?? 0,
			atRisk,
			ready,
			hasLevels: !!lv?.has
		};
	});
}

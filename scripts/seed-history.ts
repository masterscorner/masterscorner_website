// Development only: gives "Demo Shito-Ryu Karate Dojo" three months of fictional history
// (students, attendance, fees, levels, enquiries) so Insights and Levels have something to show.
// Sign in with 9000000001 to open it as the teacher. Safe to run again: it skips if done.
import { sql } from 'kysely';
import type { DB } from '../src/lib/server/db-core.ts';
import { NOTICE_VERSION } from '../src/lib/server/services/people.ts';

export const DEMO_TEACHER_PHONE = '+919000000001';

function rng(seed: number) {
	return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000));
const monthStart = (s: string) => `${s.slice(0, 7)}-01`;

export async function seedHistory(db: DB, today: string) {
	const org = await db.selectFrom('orgs').select(['id']).where('name', '=', 'Demo Shito-Ryu Karate Dojo').executeTakeFirst();
	if (!org) return;
	const done = await db.selectFrom('class_sessions').select(sql<number>`count(*)::int`.as('n')).where('org_id', '=', org.id).executeTakeFirstOrThrow();
	if (done.n > 20) return console.log('Demo history already present.');

	const rand = rng(42);
	const owner = await db.selectFrom('org_members').select('person_id').where('org_id', '=', org.id).where('role', '=', 'owner').executeTakeFirstOrThrow();
	// Free the owner record so signing in with the demo phone claims it.
	await db.updateTable('persons').set({ user_id: null, phone_e164: DEMO_TEACHER_PHONE, display_name: 'Demo Sensei' }).where('id', '=', owner.person_id).execute();
	await db.insertInto('consents').values({ subject_id: owner.person_id, given_by: owner.person_id, purpose: 'platform_account', notice_version: NOTICE_VERSION, method: 'otp_self' }).execute();

	const batches = await db.selectFrom('batches').select(['id', 'name', 'days', 'fee_paise']).where('org_id', '=', org.id).orderBy('created_at').execute();
	const start = addDays(today, -7 * 13);

	const names = ['Aravind', 'Bhavya', 'Charan', 'Deepa', 'Ezhil', 'Farhan', 'Gowri', 'Harish', 'Indu', 'Jeeva', 'Kavin', 'Lakshmi', 'Mohan', 'Nila', 'Oviya', 'Prakash', 'Rahul', 'Sneha', 'Tamil', 'Uma'];
	const people: { id: string; batch: (typeof batches)[number]; joined: string; left: string | null; keen: number }[] = [];
	for (const [i, name] of names.entries()) {
		const minor = i % 3 === 0;
		const joined = i < 12 ? addDays(start, -30 - i * 3) : addDays(start, Math.floor(rand() * 80));
		const left = i === 5 || i === 13 ? addDays(today, -20 - i) : null;
		const p = await db
			.insertInto('persons')
			.values({ display_name: `${name} Demo`, birth_date: minor ? '2014-06-01' : '1998-03-01', is_minor: minor })
			.returning('id')
			.executeTakeFirstOrThrow();
		if (minor) {
			const parent = await db.insertInto('persons').values({ display_name: `${name}'s parent (demo)`, birth_date: '1982-01-01' }).returning('id').executeTakeFirstOrThrow();
			await db.insertInto('guardianships').values({ child_id: p.id, guardian_id: parent.id, status: 'active', confirmed_at: new Date(), invited_by_org: org.id }).execute();
		}
		const batch = batches[i % 4 === 3 ? 1 : 0] ?? batches[0];
		await db
			.insertInto('enrolments')
			.values({ org_id: org.id, batch_id: batch.id, person_id: p.id, status: left ? 'left' : i === 19 ? 'trial' : 'active', joined_on: joined, left_on: left, created_by: owner.person_id })
			.execute();
		people.push({ id: p.id, batch, joined, left, keen: i === 7 || i === 16 ? -1 : 0.62 + rand() * 0.3 });
	}

	// Sessions and attendance. Attendance improves a little over time; two students stop coming.
	for (let day = start; day <= today; day = addDays(day, 1)) {
		const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
		for (const b of batches) {
			if (!b.days.includes(dow)) continue;
			const s = await db.insertInto('class_sessions').values({ org_id: org.id, batch_id: b.id, on_date: day }).onConflict((oc) => oc.doNothing()).returning('id').executeTakeFirst();
			if (!s || day === today) continue;
			const progress = (Date.parse(day) - Date.parse(start)) / (Date.parse(today) - Date.parse(start));
			const rows = people
				.filter((p) => p.batch.id === b.id && p.joined <= day && (!p.left || p.left > day))
				.map((p) => {
					const chance = p.keen < 0 ? (progress > 0.75 ? 0.02 : 0.7) : Math.min(0.97, p.keen + progress * 0.12);
					return { id: crypto.randomUUID(), org_id: org.id, session_id: s.id, person_id: p.id, status: (rand() < chance ? 'present' : rand() < 0.3 ? 'excused' : 'absent') as 'present' | 'excused' | 'absent', marked_by: owner.person_id };
				});
			if (rows.length) await db.insertInto('attendance').values(rows).execute();
		}
	}

	// Monthly fees: older months mostly paid, this month partly.
	const thisMonth = monthStart(today);
	for (let m = monthStart(addDays(start, -60)); m <= thisMonth; m = monthStart(addDays(m, 32))) {
		for (const p of people) {
			if (monthStart(p.joined) > m || (p.left && monthStart(p.left) < m) || !p.batch.fee_paise) continue;
			const paid = m < thisMonth ? rand() < 0.93 : rand() < 0.55;
			const due = addDays(m, 9);
			const inv = await db
				.insertInto('invoices')
				.values({ org_id: org.id, person_id: p.id, batch_id: p.batch.id, period_label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(`${m}T00:00:00`)), period_start: m, amount_paise: p.batch.fee_paise, due_on: due, status: paid ? 'paid' : 'due' })
				.onConflict((oc) => oc.doNothing())
				.returning('id')
				.executeTakeFirst();
			if (inv && paid) {
				await db.insertInto('payments').values({ org_id: org.id, invoice_id: inv.id, person_id: p.id, amount_paise: p.batch.fee_paise, method: rand() < 0.6 ? 'upi' : 'cash', recorded_by: owner.person_id }).execute();
			}
		}
	}

	// Karate belts, with a grading two months ago for the early joiners.
	const system = await db.selectFrom('level_systems').select('id').where('name', '=', 'Karate belts (kyu)').where('org_id', 'is', null).executeTakeFirst();
	if (system) {
		await db.updateTable('orgs').set({ level_system_id: system.id }).where('id', '=', org.id).execute();
		const levels = await db.selectFrom('levels').select('id').where('system_id', '=', system.id).orderBy('position').execute();
		for (const [i, p] of people.entries()) {
			if (p.left) continue;
			await db.insertInto('grade_awards').values({ org_id: org.id, person_id: p.id, level_id: levels[0].id, awarded_on: p.joined, awarded_by: owner.person_id }).execute();
			if (i < 10) {
				await db.insertInto('grade_awards').values({ org_id: org.id, person_id: p.id, level_id: levels[1 + (i % 2)].id, awarded_on: addDays(start, 10), awarded_by: owner.person_id, note: 'Demo grading' }).execute();
			}
		}
	}

	await db
		.insertInto('enquiries')
		.values([
			{ org_id: org.id, name: 'Meena (demo)', phone_e164: '+919888800001', message: 'Do you have a batch for 7 year olds?', for_child: true },
			{ org_id: org.id, name: 'Rajesh (demo)', phone_e164: '+919888800002', message: 'Weekend timings please.', for_child: false },
			{ org_id: org.id, name: 'Priya (demo)', phone_e164: '+919888800003', message: null, for_child: true, status: 'contacted' }
		])
		.execute();
	console.log('Demo history added. Sign in with 9000000001 to see the karate class as its teacher.');
}

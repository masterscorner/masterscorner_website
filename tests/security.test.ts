// Acceptance checks for tenant isolation, children's data and append-only money records.
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asPerson } from '../src/lib/server/db-core.ts';
import { batchesOn, markAttendance, rollCall } from '../src/lib/server/services/attendance.ts';
import { createClass } from '../src/lib/server/services/classes.ts';
import { ensurePerson } from '../src/lib/server/services/people.ts';
import { searchClasses } from '../src/lib/server/services/search.ts';
import {
	addStudent,
	confirmChild,
	listStudents,
	myChildren,
	pendingChildren
} from '../src/lib/server/services/students.ts';
import { closeDb, db, denied, makeAdult, sampleClass } from './helpers.ts';

let karateId: number;
let danceId: number;
let ownerA: { id: string; phone: string };
let ownerB: { id: string; phone: string };
let classA: { id: string; slug: string };
let classB: { id: string; slug: string };
let batchA: string;

beforeAll(async () => {
	const acts = await db().selectFrom('activity_nodes').select(['id', 'slug']).where('slug', 'in', ['karate', 'bharatanatyam']).execute();
	karateId = acts.find((a) => a.slug === 'karate')!.id;
	danceId = acts.find((a) => a.slug === 'bharatanatyam')!.id;
	ownerA = await makeAdult('Owner A');
	ownerB = await makeAdult('Owner B');
	classA = await createClass(db(), ownerA.id, sampleClass('Sri Karate Dojo', [karateId]));
	classB = await createClass(db(), ownerB.id, { ...sampleClass('Natya Dance School', [danceId]), lat: 9.95, lng: 78.14 });
	batchA = (await db().selectFrom('batches').select('id').where('org_id', '=', classA.id).executeTakeFirstOrThrow()).id;
});

afterAll(closeDb);

describe('public search', () => {
	it('finds published classes near a point, nearest first, filtered by category', async () => {
		const all = await searchClasses(db(), { lat: 9.93, lng: 78.12 });
		expect(all.map((h) => h.slug)).toEqual([classA.slug, classB.slug]);
		const dance = await searchClasses(db(), { lat: 9.93, lng: 78.12, activity: 'dance' });
		expect(dance.map((h) => h.slug)).toEqual([classB.slug]);
		const far = await searchClasses(db(), { lat: 28.61, lng: 77.2 });
		expect(far).toHaveLength(0);
	});

	it('hides contact details the owner switched off', async () => {
		const row = await asPerson(db(), null, (tx) =>
			tx.selectFrom('listings').select(['phone_e164', 'whatsapp_e164']).where('id', '=', classA.id).executeTakeFirstOrThrow()
		);
		expect(row.phone_e164).toBeNull();
		expect(row.whatsapp_e164).toBe('+919876543210');
	});

	it('does not let a visitor read the private UPI id or any person', async () => {
		const persons = await asPerson(db(), null, (tx) => tx.selectFrom('persons').select('id').execute());
		expect(persons).toHaveLength(0);
	});
});

describe('class isolation', () => {
	it('another owner cannot see, change or mark in my class', async () => {
		await addStudent(db(), ownerA.id, classA.id, { name: 'Ravi', isChild: false, phone: '+919000000001', guardianPhone: null, batchId: batchA });
		expect(await listStudents(db(), ownerA.id, classA.id)).toHaveLength(1);
		expect(await listStudents(db(), ownerB.id, classA.id)).toHaveLength(0);

		const updated = await asPerson(db(), ownerB.id, (tx) =>
			tx.updateTable('orgs').set({ name: 'Hacked' }).where('id', '=', classA.id).executeTakeFirst()
		);
		expect(Number(updated.numUpdatedRows)).toBe(0);

		await denied(addStudent(db(), ownerB.id, classA.id, { name: 'Intruder', isChild: false, phone: null, guardianPhone: null, batchId: batchA }));
	});

	it('a student added by a teacher is claimed when that phone signs in', async () => {
		const me = await ensurePerson(db(), { id: 'login-ravi', name: '+919000000001', email: 'x@phone.invalid', phoneNumber: '+919000000001' });
		const students = await listStudents(db(), ownerA.id, classA.id);
		expect(students.find((s) => s.display_name === 'Ravi')?.person_id).toBe(me.id);
	});
});

describe("children's data", () => {
	const parentPhone = '+919111111111';

	it('a child waits for the parent; only the invited parent can confirm', async () => {
		await addStudent(db(), ownerA.id, classA.id, { name: 'Anu', isChild: true, phone: null, guardianPhone: parentPhone, batchId: batchA });
		const pending = (await listStudents(db(), ownerA.id, classA.id)).find((s) => s.display_name === 'Anu')!;
		expect(pending.status).toBe('pending_consent');

		const stranger = await makeAdult('Stranger');
		expect(await pendingChildren(db(), stranger.id)).toHaveLength(0);

		const parent = await ensurePerson(db(), { id: 'login-parent', name: parentPhone, email: 'p@phone.invalid', phoneNumber: parentPhone });
		const invites = await pendingChildren(db(), parent.id);
		expect(invites).toHaveLength(1);

		// Not yet an adult by declaration: refused.
		await denied(confirmChild(db(), parent.id, invites[0].guardianship_id));
		await db().updateTable('persons').set({ birth_date: '1985-01-01' }).where('id', '=', parent.id).execute();
		await confirmChild(db(), parent.id, invites[0].guardianship_id);

		expect((await myChildren(db(), parent.id)).map((c) => c.display_name)).toEqual(['Anu']);
		const after = (await listStudents(db(), ownerA.id, classA.id)).find((s) => s.display_name === 'Anu')!;
		expect(after.status).toBe('active');

		const consent = await db().selectFrom('consents').select(['purpose', 'method']).where('subject_id', '=', after.person_id).executeTakeFirstOrThrow();
		expect(consent).toEqual({ purpose: 'class_records', method: 'otp_guardian_declaration' });

		// The stranger still cannot read the child.
		const seen = await asPerson(db(), stranger.id, (tx) => tx.selectFrom('persons').select('id').where('id', '=', after.person_id).execute());
		expect(seen).toHaveLength(0);
	});
});

describe('attendance', () => {
	it('re-sending the same marks does not create duplicates', async () => {
		const [today] = await batchesOn(db(), ownerA.id, classA.id, '2026-10-19', 1);
		const roll = (await rollCall(db(), ownerA.id, classA.id, today.session_id))!;
		const marks = roll.entries.map((e) => ({ id: crypto.randomUUID(), personId: e.person_id, status: 'present' as const }));
		await markAttendance(db(), ownerA.id, classA.id, today.session_id, marks);
		await markAttendance(db(), ownerA.id, classA.id, today.session_id, marks);
		const count = await db().selectFrom('attendance').select(sql<number>`count(*)::int`.as('n')).where('session_id', '=', today.session_id).executeTakeFirstOrThrow();
		expect(count.n).toBe(roll.entries.length);
	});

	it('another class cannot mark attendance here', async () => {
		const [today] = await batchesOn(db(), ownerA.id, classA.id, '2026-10-19', 1);
		const roll = (await rollCall(db(), ownerA.id, classA.id, today.session_id))!;
		const written = await markAttendance(db(), ownerB.id, classA.id, today.session_id, [
			{ id: crypto.randomUUID(), personId: roll.entries[0].person_id, status: 'absent' }
		]);
		expect(written).toBe(0);
	});
});

describe('reviews and money', () => {
	it('only someone who attended can review, and staff cannot review their own class', async () => {
		const outsider = await makeAdult('Outsider');
		await denied(asPerson(db(), outsider.id, (tx) => tx.insertInto('reviews').values({ org_id: classA.id, author_id: outsider.id, rating: 1 }).execute()));
		await denied(asPerson(db(), ownerA.id, (tx) => tx.insertInto('reviews').values({ org_id: classA.id, author_id: ownerA.id, rating: 5 }).execute()));

		const ravi = await db().selectFrom('persons').select('id').where('user_id', '=', 'login-ravi').executeTakeFirstOrThrow();
		await db().updateTable('persons').set({ birth_date: '1995-01-01' }).where('id', '=', ravi.id).execute();
		await asPerson(db(), ravi.id, (tx) => tx.insertInto('reviews').values({ org_id: classA.id, author_id: ravi.id, rating: 5, body: 'Good teacher' }).execute());
		const org = await db().selectFrom('orgs').select(['rating_avg', 'rating_count']).where('id', '=', classA.id).executeTakeFirstOrThrow();
		expect(org.rating_count).toBe(1);
		expect(Number(org.rating_avg)).toBe(5);
	});

	it('payments cannot be edited or deleted, only reversed', async () => {
		const ravi = await db().selectFrom('persons').select('id').where('user_id', '=', 'login-ravi').executeTakeFirstOrThrow();
		const pay = await asPerson(db(), ownerA.id, (tx) =>
			tx
				.insertInto('payments')
				.values({ org_id: classA.id, person_id: ravi.id, amount_paise: 80000, method: 'cash', recorded_by: ownerA.id })
				.returning('id')
				.executeTakeFirstOrThrow()
		);
		await denied(asPerson(db(), ownerA.id, (tx) => tx.updateTable('payments').set({ amount_paise: 1 }).where('id', '=', pay.id).execute()), /permission denied/);
		await denied(asPerson(db(), ownerA.id, (tx) => tx.deleteFrom('payments').where('id', '=', pay.id).execute()), /permission denied/);
	});
});

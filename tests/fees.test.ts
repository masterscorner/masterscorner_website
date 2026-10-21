import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asPerson } from '../src/lib/server/db-core.ts';
import { createClass } from '../src/lib/server/services/classes.ts';
import { claimPaid, feesForMonth, markPaid, monthStart, undoPaid } from '../src/lib/server/services/fees.ts';
import { addStudent } from '../src/lib/server/services/students.ts';
import { closeDb, db, makeAdult, sampleClass } from './helpers.ts';

let owner: { id: string };
let other: { id: string };
let orgId: string;
let studentId: string;
const month = '2026-10-01';

beforeAll(async () => {
	const karate = await db().selectFrom('activity_nodes').select('id').where('slug', '=', 'karate').executeTakeFirstOrThrow();
	owner = await makeAdult('Fee Owner');
	other = await makeAdult('Other Owner');
	orgId = (await createClass(db(), owner.id, sampleClass('Fee Test Dojo', [karate.id]))).id;
	await createClass(db(), other.id, sampleClass('Other Dojo', [karate.id]));
	const batch = await db().selectFrom('batches').select('id').where('org_id', '=', orgId).executeTakeFirstOrThrow();
	studentId = await addStudent(db(), owner.id, orgId, { name: 'Payer', isChild: false, phone: '+919000011111', guardianPhone: null, batchId: batch.id });
	await db().updateTable('enrolments').set({ joined_on: '2026-09-01' }).where('person_id', '=', studentId).execute();
});
afterAll(closeDb);

describe('fees', () => {
	it('creates one bill per student per month, even when opened twice', async () => {
		const a = await feesForMonth(db(), owner.id, orgId, month, '2026-10-19');
		const b = await feesForMonth(db(), owner.id, orgId, month, '2026-10-19');
		expect(a.rows).toHaveLength(1);
		expect(b.rows).toHaveLength(1);
		expect(a.totalPaise).toBe(80000);
		expect(a.rows[0].overdue).toBe(true); // due on the 10th
	});

	it('marking paid then undoing keeps every payment record', async () => {
		const { rows } = await feesForMonth(db(), owner.id, orgId, month, '2026-10-19');
		await markPaid(db(), owner.id, orgId, rows[0].invoice_id, 'cash', null);
		expect((await feesForMonth(db(), owner.id, orgId, month, '2026-10-19')).collectedPaise).toBe(80000);
		await undoPaid(db(), owner.id, orgId, rows[0].invoice_id);
		const after = await feesForMonth(db(), owner.id, orgId, month, '2026-10-19');
		expect(after.collectedPaise).toBe(0);
		const pays = await db().selectFrom('payments').select(['amount_paise']).where('invoice_id', '=', rows[0].invoice_id).orderBy('recorded_at').execute();
		expect(pays.map((p) => p.amount_paise)).toEqual([80000, -80000]);
	});

	it('another class cannot see or mark these fees', async () => {
		const seen = await feesForMonth(db(), other.id, orgId, month, '2026-10-19');
		expect(seen.rows).toHaveLength(0);
		const { rows } = await feesForMonth(db(), owner.id, orgId, month, '2026-10-19');
		await expect(markPaid(db(), other.id, orgId, rows[0].invoice_id, 'cash', null)).rejects.toThrow();
		await closeDb();
	});

	it('the student can say they paid, and the teacher sees it', async () => {
		await db().updateTable('persons').set({ user_id: 'payer-login', birth_date: '1990-01-01' }).where('id', '=', studentId).execute();
		const { rows } = await feesForMonth(db(), owner.id, orgId, month, '2026-10-19');
		expect(await claimPaid(db(), studentId, rows[0].invoice_id, '123456789012')).toBe(true);
		const again = await feesForMonth(db(), owner.id, orgId, month, '2026-10-19');
		expect(again.rows[0].claim_reference).toBe('123456789012');
		const n = await asPerson(db(), studentId, (tx) => tx.selectFrom('invoices').select(sql<number>`count(*)::int`.as('n')).executeTakeFirstOrThrow());
		expect(n.n).toBe(1);
	});
});

describe('month helper', () => {
	it('finds the first day of the month', () => {
		expect(monthStart('2026-10-19')).toBe('2026-10-01');
	});
});

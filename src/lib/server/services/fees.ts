// Fees without online payment: the class keeps monthly dues, marks them paid (cash or UPI to the
// teacher), and reminds students on WhatsApp. Payments are append-only; "undo" adds a reversal.
import { sql } from 'kysely';
import { asPerson, type DB, type Tx } from '../db-core.ts';

export type PayMethod = 'cash' | 'upi' | 'bank' | 'other';

/** First day of the month containing `date` (YYYY-MM-DD). */
export function monthStart(date: string): string {
	return `${date.slice(0, 7)}-01`;
}

export function monthLabel(start: string): string {
	const d = new Date(`${start}T00:00:00Z`);
	return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
}

export function addMonths(start: string, n: number): string {
	const [y, m] = start.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 1 + n, 1));
	return d.toISOString().slice(0, 10);
}

/**
 * Creates the dues for one month for every active student in a monthly (or 3-monthly) batch.
 * Safe to run many times: one bill per student, batch and period.
 */
export async function ensureMonthDues(tx: Tx, orgId: string, start: string) {
	const month = Number(start.slice(5, 7));
	const quarterStart = (month - 1) % 3 === 0;
	await sql`
		insert into invoices (org_id, person_id, batch_id, period_label, period_start, amount_paise, due_on)
		select e.org_id, e.person_id, b.id,
			${monthLabel(start)},
			${start}::date,
			case when b.fee_period = 'quarter' then b.fee_paise else b.fee_paise end,
			(${start}::date + ((o.fee_due_day - 1) || ' days')::interval)::date
		from enrolments e
		join batches b on b.id = e.batch_id
		join orgs o on o.id = e.org_id
		where e.org_id = ${orgId}
			and e.status in ('active', 'trial')
			and b.fee_paise > 0
			and (b.fee_period = 'month' or (b.fee_period = 'quarter' and ${quarterStart}::boolean))
			and e.joined_on < (${start}::date + interval '1 month')
		on conflict (person_id, batch_id, period_start) do nothing
	`.execute(tx);
}

export interface DueRow {
	invoice_id: string;
	person_id: string;
	display_name: string;
	batch_name: string | null;
	amount_paise: number;
	status: 'due' | 'paid' | 'waived' | 'cancelled';
	due_on: string;
	overdue: boolean;
	paid_on: string | null;
	method: string | null;
	payment_id: string | null;
	contact_phone: string | null;
	is_minor: boolean;
	claim_id: string | null;
	claim_reference: string | null;
}

export interface FeesMonth {
	start: string;
	label: string;
	rows: DueRow[];
	totalPaise: number;
	collectedPaise: number;
	duePaise: number;
	unpaidCount: number;
}

export function feesForMonth(db: DB, personId: string, orgId: string, start: string, today: string): Promise<FeesMonth> {
	return asPerson(db, personId, async (tx) => {
		await ensureMonthDues(tx, orgId, start);
		const { rows } = await sql<DueRow>`
			select i.id as invoice_id, p.id as person_id, p.display_name, b.name as batch_name,
				i.amount_paise, i.status, to_char(i.due_on, 'YYYY-MM-DD') as due_on,
				(i.status = 'due' and i.due_on < ${today}::date) as overdue,
				to_char(lp.recorded_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as paid_on, lp.method, lp.id as payment_id,
				coalesce(p.phone_e164, gp.phone_e164, g.invited_phone) as contact_phone, p.is_minor,
				c.id as claim_id, c.reference as claim_reference
			from invoices i
			join persons p on p.id = i.person_id
			left join batches b on b.id = i.batch_id
			left join lateral (
				select pay.id, pay.method, pay.recorded_at from payments pay
				where pay.invoice_id = i.id and pay.amount_paise > 0
					and not exists (select 1 from payments r where r.reverses = pay.id)
				order by pay.recorded_at desc limit 1
			) lp on true
			left join lateral (
				select g.guardian_id, g.invited_phone from guardianships g
				where g.child_id = p.id and g.status <> 'revoked' order by g.status = 'active' desc limit 1
			) g on true
			left join persons gp on gp.id = g.guardian_id
			left join lateral (
				select pc.id, pc.reference from payment_claims pc
				where pc.invoice_id = i.id and pc.status = 'pending' order by pc.created_at desc limit 1
			) c on true
			where i.org_id = ${orgId} and i.period_start = ${start}::date and i.status <> 'cancelled'
			order by (i.status = 'due') desc, c.id is null, p.display_name
		`.execute(tx);
		const live = rows.filter((r) => r.status !== 'waived');
		const totalPaise = live.reduce((s, r) => s + r.amount_paise, 0);
		const collectedPaise = live.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount_paise, 0);
		return {
			start,
			label: monthLabel(start),
			rows,
			totalPaise,
			collectedPaise,
			duePaise: totalPaise - collectedPaise,
			unpaidCount: live.filter((r) => r.status === 'due').length
		};
	});
}

async function invoiceFor(tx: Tx, orgId: string, invoiceId: string) {
	return tx
		.selectFrom('invoices')
		.select(['id', 'person_id', 'amount_paise', 'status'])
		.where('id', '=', invoiceId)
		.where('org_id', '=', orgId)
		.executeTakeFirst();
}

/** Marks a due bill as paid (money already received by the teacher). */
export function markPaid(db: DB, personId: string, orgId: string, invoiceId: string, method: PayMethod, reference: string | null) {
	return asPerson(db, personId, async (tx) => {
		const inv = await invoiceFor(tx, orgId, invoiceId);
		if (!inv) throw new Error('Bill not found');
		if (inv.status === 'paid') return false;
		await tx
			.insertInto('payments')
			.values({ org_id: orgId, invoice_id: inv.id, person_id: inv.person_id, amount_paise: inv.amount_paise, method, reference, recorded_by: personId })
			.execute();
		await tx.updateTable('invoices').set({ status: 'paid' }).where('id', '=', inv.id).execute();
		await tx
			.updateTable('payment_claims')
			.set({ status: 'accepted', decided_at: new Date(), decided_by: personId })
			.where('invoice_id', '=', inv.id)
			.where('status', '=', 'pending')
			.execute();
		return true;
	});
}

/** Undo a "paid" mark: a reversal payment is added, nothing is deleted. */
export function undoPaid(db: DB, personId: string, orgId: string, invoiceId: string) {
	return asPerson(db, personId, async (tx) => {
		const inv = await invoiceFor(tx, orgId, invoiceId);
		if (!inv || inv.status !== 'paid') return false;
		const pays = await tx
			.selectFrom('payments')
			.select(['id', 'amount_paise', 'method'])
			.where('invoice_id', '=', inv.id)
			.where('amount_paise', '>', 0)
			.execute();
		const reversed = new Set(
			(await tx.selectFrom('payments').select('reverses').where('invoice_id', '=', inv.id).where('reverses', 'is not', null).execute()).map((r) => r.reverses)
		);
		for (const p of pays.filter((p) => !reversed.has(p.id))) {
			await tx
				.insertInto('payments')
				.values({ org_id: orgId, invoice_id: inv.id, person_id: inv.person_id, amount_paise: -p.amount_paise, method: p.method, reverses: p.id, recorded_by: personId })
				.execute();
		}
		await tx.updateTable('invoices').set({ status: 'due' }).where('id', '=', inv.id).execute();
		return true;
	});
}

export function setWaived(db: DB, personId: string, orgId: string, invoiceId: string, waived: boolean) {
	return asPerson(db, personId, async (tx) => {
		await tx
			.updateTable('invoices')
			.set({ status: waived ? 'waived' : 'due' })
			.where('id', '=', invoiceId)
			.where('org_id', '=', orgId)
			.where('status', '=', waived ? 'due' : 'waived')
			.execute();
	});
}

export function rejectClaim(db: DB, personId: string, orgId: string, claimId: string) {
	return asPerson(db, personId, (tx) =>
		tx
			.updateTable('payment_claims')
			.set({ status: 'rejected', decided_at: new Date(), decided_by: personId })
			.where('id', '=', claimId)
			.where('org_id', '=', orgId)
			.where('status', '=', 'pending')
			.execute()
	);
}

/** Student or parent says "I have paid" for one of their bills. */
export function claimPaid(db: DB, personId: string, invoiceId: string, reference: string | null) {
	return asPerson(db, personId, async (tx) => {
		const inv = await tx.selectFrom('invoices').select(['id', 'org_id', 'status']).where('id', '=', invoiceId).executeTakeFirst();
		if (!inv || inv.status !== 'due') return false;
		const open = await tx
			.selectFrom('payment_claims')
			.select('id')
			.where('invoice_id', '=', invoiceId)
			.where('status', '=', 'pending')
			.executeTakeFirst();
		if (open) return true;
		await tx.insertInto('payment_claims').values({ org_id: inv.org_id, invoice_id: inv.id, claimed_by: personId, reference }).execute();
		return true;
	});
}

/** upi://pay link that opens GPay / PhonePe / Paytm with the amount filled in. */
export function upiLink(upiId: string, payeeName: string, amountPaise: number, note: string): string {
	const params = new URLSearchParams({ pa: upiId, pn: payeeName.slice(0, 40), am: (amountPaise / 100).toFixed(2), cu: 'INR', tn: note.slice(0, 50) });
	return `upi://pay?${params.toString()}`;
}

import { error, fail } from '@sveltejs/kit';
import { renderSVG } from 'uqr';
import { resetDevConnection } from '#lib/server/db.ts';
import { localDay } from '#lib/server/services/attendance.ts';
import { addMonths, feesForMonth, markPaid, monthStart, rejectClaim, setWaived, undoPaid, upiLink, type PayMethod } from '#lib/server/services/fees.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { me, org } = await parent();
	if (org.role === 'instructor') error(403, 'Only the owner or admin can see fees');
	const today = localDay(org.timezone).date;
	const thisMonth = monthStart(today);
	const asked = url.searchParams.get('m');
	const start = asked && /^\d{4}-\d{2}-01$/.test(asked) && asked <= thisMonth && asked >= addMonths(thisMonth, -24) ? asked : thisMonth;
	const fees = await feesForMonth(locals.db, me.id, org.id, start, today);
	const qr = org.upi_id ? renderSVG(upiLink(org.upi_id, org.name, 0, 'Fees').replace(/&am=0\.00/, ''), { border: 1 }) : null;
	return {
		fees,
		prev: addMonths(start, -1),
		next: start < thisMonth ? addMonths(start, 1) : null,
		qr
	};
};

const METHODS: PayMethod[] = ['cash', 'upi', 'bank', 'other'];

async function run(fn: () => Promise<unknown>, okMessage: string) {
	try {
		await fn();
		return { message: okMessage };
	} catch (err) {
		await resetDevConnection();
		console.error(err);
		return fail(400, { error: 'Could not save. Please try again.' });
	}
}

export const actions: Actions = {
	pay: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const method = String(d.get('method')) as PayMethod;
		if (!METHODS.includes(method)) return fail(400, { error: 'Choose how they paid' });
		const ref = String(d.get('reference') ?? '').trim().slice(0, 64) || null;
		return run(() => markPaid(locals.db, me.id, params.orgId, String(d.get('invoice')), method, ref), 'Marked as paid.');
	},
	undo: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		return run(() => undoPaid(locals.db, me.id, params.orgId, String(d.get('invoice'))), 'Changed back to not paid.');
	},
	waive: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		return run(() => setWaived(locals.db, me.id, params.orgId, String(d.get('invoice')), d.get('on') === '1'), d.get('on') === '1' ? 'Fee waived for this month.' : 'Fee is due again.');
	},
	reject: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		return run(() => rejectClaim(locals.db, me.id, params.orgId, String(d.get('claim'))), 'Marked as not received.');
	}
};

import { error, fail } from '@sveltejs/kit';
import { attempt, str } from '#lib/server/form.ts';
import { localDay } from '#lib/server/services/attendance.ts';
import { addMonths, claimPaid, monthStart, upiLink } from '#lib/server/services/fees.ts';
import { learnerView, saveReview } from '#lib/server/services/learner.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals, params }) => {
	const { me } = await parent();
	const today = localDay('Asia/Kolkata').date;
	const since = addMonths(monthStart(today), -2);
	const view = await learnerView(locals.db, me.id, params.personId, params.orgId, since);
	if (!view) error(404, 'Not found');
	const payLinks = Object.fromEntries(
		view.invoices
			.filter((i) => i.status === 'due' && view.org.upi_id)
			.map((i) => [i.id, upiLink(view.org.upi_id!, view.org.name, i.amount_paise, `Fees ${i.period_label} ${view.person.name}`)])
	);
	return { view, payLinks, today, monthStart: monthStart(today) };
};

export const actions: Actions = {
	claim: async ({ request, locals }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const ref = str(d, 'reference').replace(/\s/g, '').slice(0, 64) || null;
		if (ref && !/^[A-Za-z0-9]{6,40}$/.test(ref)) return fail(400, { error: 'UPI reference has only letters and numbers' });
		return attempt(() => claimPaid(locals.db, me.id, str(d, 'invoice'), ref), 'Thank you. The teacher will check and confirm.');
	},
	review: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const rating = Number(str(d, 'rating'));
		if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail(400, { error: 'Please choose 1 to 5 stars' });
		const body = str(d, 'body').slice(0, 1000) || null;
		return attempt(() => saveReview(locals.db, me.id, params.orgId, rating, body), 'Thank you for your review.', 'Only students who came to a class can review.');
	}
};

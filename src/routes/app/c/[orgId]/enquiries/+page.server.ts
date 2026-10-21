import { fail } from '@sveltejs/kit';
import { attempt, str } from '#lib/server/form.ts';
import { requireManager } from '#lib/server/require.ts';
import { listEnquiries, updateEnquiry, type EnquiryStatus } from '#lib/server/services/inbox.ts';
import type { Actions, PageServerLoad } from './$types';

const STATUSES: EnquiryStatus[] = ['new', 'contacted', 'trial_booked', 'joined', 'closed'];

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { me, org } = await parent();
	requireManager(org.role);
	return { enquiries: await listEnquiries(locals.db, me.id, org.id) };
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const status = str(d, 'status') as EnquiryStatus;
		if (!STATUSES.includes(status)) return fail(400, { error: 'Choose a status' });
		return attempt(() => updateEnquiry(locals.db, me.id, params.orgId, str(d, 'id'), status, str(d, 'note').slice(0, 500) || null), 'Saved.');
	}
};

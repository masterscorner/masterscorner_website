import { fail } from '@sveltejs/kit';
import { ORIGIN } from '$app/env/private';
import { normalisePhone } from '#lib/phone.ts';
import { attempt, str } from '#lib/server/form.ts';
import { requireManager } from '#lib/server/require.ts';
import { cancelInvite, inviteStaff, removeStaff, staffPage } from '#lib/server/services/staff.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { me, org } = await parent();
	requireManager(org.role);
	return { staff: await staffPage(locals.db, me.id, org.id), origin: ORIGIN, myId: me.id };
};

export const actions: Actions = {
	invite: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const phone = normalisePhone(str(d, 'phone'));
		if (!phone) return fail(400, { error: 'Please type a 10 digit mobile number' });
		const role = str(d, 'role') === 'admin' ? 'admin' : 'instructor';
		const res = await attempt(() => inviteStaff(locals.db, me.id, params.orgId, phone, role), 'Invitation ready. Send it on WhatsApp.', 'This number is already invited.');
		return 'message' in res ? { ...res, invited: { phone, role } } : res;
	},
	cancel: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		return attempt(() => cancelInvite(locals.db, me.id, params.orgId, str(d, 'id')), 'Invitation cancelled.');
	},
	remove: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		return attempt(() => removeStaff(locals.db, me.id, params.orgId, str(d, 'person')), 'Removed from staff.');
	}
};

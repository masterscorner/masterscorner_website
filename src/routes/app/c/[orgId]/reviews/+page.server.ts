import { fail } from '@sveltejs/kit';
import { attempt, str } from '#lib/server/form.ts';
import { requireManager } from '#lib/server/require.ts';
import { listReviews, replyToReview } from '#lib/server/services/inbox.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { me, org } = await parent();
	requireManager(org.role);
	return { reviews: await listReviews(locals.db, me.id, org.id) };
};

export const actions: Actions = {
	reply: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		return attempt(() => replyToReview(locals.db, me.id, params.orgId, str(d, 'id'), str(d, 'body').slice(0, 1000) || null), 'Reply saved.');
	}
};

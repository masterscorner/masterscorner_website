import { fail, redirect } from '@sveltejs/kit';
import { resetDevConnection } from '#lib/server/db.ts';
import { myClasses } from '#lib/server/services/classes.ts';
import { myLearning } from '#lib/server/services/learner.ts';
import { acceptInvite, myInvites } from '#lib/server/services/staff.ts';
import { confirmChild, declineChild, myChildren, pendingChildren } from '#lib/server/services/students.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { me } = await parent();
	const [classes, pending, children, learning, invites] = await Promise.all([
		myClasses(locals.db, me.id),
		pendingChildren(locals.db, me.id),
		myChildren(locals.db, me.id),
		myLearning(locals.db, me.id),
		myInvites(locals.db, me.id)
	]);
	return { classes, pending, children, learning, invites };
};

async function decide(locals: App.Locals, data: FormData, yes: boolean) {
	const me = await locals.me();
	const id = String(data.get('id') ?? '');
	if (!me || !id) return fail(400, { error: 'Something is missing' });
	try {
		if (yes) await confirmChild(locals.db, me.id, id);
		else await declineChild(locals.db, me.id, id);
	} catch (err) {
		await resetDevConnection();
		const msg = String((err as Error).message);
		return fail(400, { error: msg.includes('adult') ? 'Only an adult can confirm.' : 'This invitation is no longer open.' });
	}
	return { done: yes ? 'confirmed' : 'declined' };
}

export const actions: Actions = {
	confirm: async ({ request, locals }) => decide(locals, await request.formData(), true),
	decline: async ({ request, locals }) => decide(locals, await request.formData(), false),
	join: async ({ request, locals }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const id = String((await request.formData()).get('id') ?? '');
		let orgId: string;
		try {
			orgId = await acceptInvite(locals.db, me.id, id);
		} catch {
			await resetDevConnection();
			return fail(400, { error: 'This invitation is no longer open.' });
		}
		redirect(303, `/app/c/${orgId}`);
	}
};

import { fail, redirect } from '@sveltejs/kit';
import { resetDevConnection } from '#lib/server/db.ts';
import { completeWelcome } from '#lib/server/services/people.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { me } = await parent();
	if (!me.needsWelcome) redirect(303, '/app');
	return { thisYear: new Date().getFullYear() };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const me = await locals.me();
		if (!me) redirect(303, '/login');
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const year = Number(data.get('birth_year'));
		const agreed = data.get('agree') === 'on';
		const thisYear = new Date().getFullYear();
		const values = { name, birth_year: String(data.get('birth_year') ?? '') };

		if (name.length < 2 || name.length > 80) return fail(400, { error: 'Please type your name', values });
		if (!Number.isInteger(year) || year < thisYear - 110 || year > thisYear) return fail(400, { error: 'Please choose the year you were born', values });
		if (thisYear - year < 18) {
			return fail(400, { error: 'You must be 18 or older to have an account. Ask a parent to sign in and add you as their child.', values, minor: true });
		}
		if (!agreed) return fail(400, { error: 'Please tick the box to continue', values });

		try {
			await completeWelcome(locals.db, me.id, name, year);
		} catch (err) {
			await resetDevConnection();
			console.error(err);
			return fail(500, { error: 'Could not save. Please try again.', values });
		}
		const next = url.searchParams.get('next');
		redirect(303, next && next.startsWith('/app') ? next : '/app');
	}
};

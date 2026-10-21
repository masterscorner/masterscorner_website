import { fail } from '@sveltejs/kit';
import { attempt, str } from '#lib/server/form.ts';
import { localDay } from '#lib/server/services/attendance.ts';
import { awardLevel, copyTemplate, levelsPage, revokeAward, saveOwnLevels, useTemplate } from '#lib/server/services/levels.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { me, org } = await parent();
	return { page: await levelsPage(locals.db, me.id, org.id), today: localDay(org.timezone).date };
};


export const actions: Actions = {
	template: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const id = str(d, 'template');
		const copy = str(d, 'copy') === '1';
		if (copy && /^\d+$/.test(id)) return attempt(() => copyTemplate(locals.db, me.id, params.orgId, Number(id)), 'List copied. You can change it now.');
		return attempt(() => useTemplate(locals.db, me.id, params.orgId, /^\d+$/.test(id) ? Number(id) : null), 'Level list saved.');
	},
	own: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const names = d.getAll('level').map((x) => String(x).trim().slice(0, 40));
		const colors = d.getAll('color').map((x) => String(x));
		const items = names
			.map((name, i) => ({ name, color: /^#[0-9a-fA-F]{6}$/.test(colors[i] ?? '') ? colors[i] : null }))
			.filter((x) => x.name);
		if (items.length < 2) return fail(400, { error: 'Add at least 2 levels' });
		if (items.length > 20) return fail(400, { error: 'Up to 20 levels' });
		return attempt(() => saveOwnLevels(locals.db, me.id, params.orgId, str(d, 'name').slice(0, 60) || 'Our levels', items), 'Level list saved.');
	},
	award: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const level = Number(str(d, 'level'));
		const on = str(d, 'on');
		if (!Number.isInteger(level)) return fail(400, { error: 'Choose a level' });
		if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) return fail(400, { error: 'Choose the date' });
		return attempt(() => awardLevel(locals.db, me.id, params.orgId, str(d, 'person'), level, on, str(d, 'note').slice(0, 300) || null), 'Level given. Well done!');
	},
	revoke: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		return attempt(() => revokeAward(locals.db, me.id, params.orgId, str(d, 'id')), 'Marked as a mistake. History is kept.');
	}
};

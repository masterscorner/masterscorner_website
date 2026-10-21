import { error } from '@sveltejs/kit';
import { staffOrg } from '#lib/server/services/org.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params, parent }) => {
	const { me } = await parent();
	const org = await staffOrg(locals.db, me.id, params.orgId);
	if (!org) error(404, 'Class not found');
	return { org };
};

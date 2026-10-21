import { ORIGIN } from '$app/env/private';
import { newEnquiryCount } from '#lib/server/services/inbox.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { me, org } = await parent();
	const newEnquiries = org.role === 'instructor' ? 0 : await newEnquiryCount(locals.db, me.id, org.id);
	return { origin: ORIGIN, newEnquiries };
};

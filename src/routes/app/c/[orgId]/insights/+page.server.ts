import { localDay } from '#lib/server/services/attendance.ts';
import { classInsights } from '#lib/server/services/insights.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { me, org } = await parent();
	const today = localDay(org.timezone).date;
	const insights = await classInsights(locals.db, me.id, org.id, today, org.role !== 'instructor');
	return { insights, today };
};

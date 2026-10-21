import { batchesOn, localDay } from '#lib/server/services/attendance.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { me, org } = await parent();
	const today = localDay(org.timezone);
	const yesterday = localDay(org.timezone, new Date(Date.now() - 86_400_000));
	const which = url.searchParams.get('day') === 'yesterday' ? yesterday : today;
	const batches = await batchesOn(locals.db, me.id, org.id, which.date, which.dow);
	return { day: which.date, isToday: which === today, batches, justCreated: url.searchParams.get('new') === '1' };
};

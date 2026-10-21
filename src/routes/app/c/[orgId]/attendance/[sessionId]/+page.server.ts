import { error, fail } from '@sveltejs/kit';
import type { AttendanceStatus } from '#lib/server/db-types.ts';
import { resetDevConnection } from '#lib/server/db.ts';
import { markAttendance, rollCall } from '#lib/server/services/attendance.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { me, org } = await parent();
	const roll = await rollCall(locals.db, me.id, org.id, params.sessionId);
	if (!roll) error(404, 'Batch not found');
	return { roll };
};

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const data = await request.formData();
		const allPresent = data.get('all_present') === '1';
		const marks: { id: string; personId: string; status: AttendanceStatus }[] = [];
		for (const [key, value] of data.entries()) {
			if (!key.startsWith('s:')) continue;
			const personId = key.slice(2);
			const status = String(value) as AttendanceStatus;
			if (!STATUSES.includes(status)) continue;
			const id = String(data.get(`id:${personId}`) || crypto.randomUUID());
			marks.push({ id, personId, status });
		}
		if (allPresent) {
			const roll = await rollCall(locals.db, me.id, params.orgId, params.sessionId);
			for (const e of roll?.entries ?? []) {
				if (!marks.some((m) => m.personId === e.person_id)) {
					marks.push({ id: crypto.randomUUID(), personId: e.person_id, status: 'present' });
				}
			}
		}
		try {
			const saved = await markAttendance(locals.db, me.id, params.orgId, params.sessionId, marks);
			return { saved };
		} catch (err) {
			await resetDevConnection();
			console.error(err);
			return fail(500, { error: 'Could not save. Please try again.' });
		}
	}
};

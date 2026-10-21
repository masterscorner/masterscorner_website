import { fail } from '@sveltejs/kit';
import { ORIGIN } from '$app/env/private';
import { normalisePhone } from '#lib/phone.ts';
import { resetDevConnection } from '#lib/server/db.ts';
import { addStudent, listStudents } from '#lib/server/services/students.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { me, org } = await parent();
	const students = await listStudents(locals.db, me.id, org.id);
	return { students, origin: ORIGIN };
};

export const actions: Actions = {
	add: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const data = await request.formData();
		const values = Object.fromEntries(data) as Record<string, string>;
		const name = (values.name ?? '').trim();
		const isChild = values.who === 'child';
		const batchId = values.batch_id ?? '';
		if (name.length < 1 || name.length > 80) return fail(400, { error: 'Please type the student name', values });
		if (!/^[0-9a-f-]{36}$/.test(batchId)) return fail(400, { error: 'Please choose a batch', values });

		const phone = !isChild && values.phone?.trim() ? normalisePhone(values.phone) : null;
		if (!isChild && values.phone?.trim() && !phone) return fail(400, { error: 'Please check the phone number', values });
		const guardianPhone = isChild ? normalisePhone(values.guardian_phone ?? '') : null;
		if (isChild && !guardianPhone) return fail(400, { error: "Please type the parent's mobile number", values });

		try {
			await addStudent(locals.db, me.id, params.orgId, { name, isChild, phone, guardianPhone, batchId });
		} catch (err) {
			await resetDevConnection();
			console.error(err);
			return fail(403, { error: 'Could not add. Only the owner or admin can add students.', values });
		}
		return { added: { name, isChild, guardianPhone } };
	}
};

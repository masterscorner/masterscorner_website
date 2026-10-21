import { fail } from '@sveltejs/kit';
import { normalisePhone } from '#lib/phone.ts';
import { resetDevConnection } from '#lib/server/db.ts';
import { asPerson } from '#lib/server/db-core.ts';
import { allow } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

const REASONS = ['fake', 'abusive', 'privacy', 'impersonation', 'copyright', 'child_safety', 'other'] as const;
const TYPES = ['org', 'review', 'photo', 'person', 'safety'] as const;

export const load: PageServerLoad = ({ url }) => {
	const type = url.searchParams.get('type');
	return {
		type: TYPES.includes(type as never) ? type : null,
		id: /^[0-9a-f-]{36}$/.test(url.searchParams.get('id') ?? '') ? url.searchParams.get('id') : null
	};
};

export const actions: Actions = {
	default: async ({ request, locals, getClientAddress }) => {
		const data = await request.formData();
		const reason = String(data.get('reason') ?? '');
		const details = String(data.get('details') ?? '').trim();
		const type = String(data.get('type') ?? '') || (reason === 'child_safety' ? 'safety' : 'org');
		const id = String(data.get('id') ?? '');
		const phoneTyped = String(data.get('phone') ?? '').trim();
		const phone = phoneTyped ? normalisePhone(phoneTyped) : null;
		if (!REASONS.includes(reason as never)) return fail(400, { error: 'Please choose what is wrong' });
		if (!TYPES.includes(type as never)) return fail(400, { error: 'Please choose what is wrong' });
		if (details.length < 10) return fail(400, { error: 'Please tell us a little more (at least 10 letters)' });
		if (phoneTyped && !phone) return fail(400, { error: 'Please check the phone number' });
		if (!(await allow(locals.db, `report:${getClientAddress()}`, 10, 3600))) return fail(429, { error: 'Too many reports. Please try later.' });

		const me = await locals.me();
		try {
			await asPerson(locals.db, me?.id ?? null, (tx) =>
				tx
					.insertInto('reports')
					.values({
						target_type: type as (typeof TYPES)[number],
						target_id: /^[0-9a-f-]{36}$/.test(id) ? id : null,
						reason: reason as (typeof REASONS)[number],
						details: details.slice(0, 2000),
						reporter_id: me?.id ?? null,
						reporter_phone: phone
					})
					.execute()
			);
		} catch (err) {
			await resetDevConnection();
			console.error(err);
			return fail(500, { error: 'Could not send. Please try again.' });
		}
		return { sent: true };
	}
};

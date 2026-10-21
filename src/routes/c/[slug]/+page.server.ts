import { error, fail } from '@sveltejs/kit';
import * as v from 'valibot';
import { normalisePhone } from '#lib/phone.ts';
import { resetDevConnection } from '#lib/server/db.ts';
import { classProfile, sendEnquiry } from '#lib/server/services/profile.ts';
import { looksSignedIn } from '#lib/server/session-hint.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, cookies, setHeaders }) => {
	const profile = await classProfile(locals.db, params.slug);
	if (!profile) error(404, 'Class not found');
	setHeaders({ 'cache-control': 'public, max-age=60, s-maxage=300' });
	return { profile, signedIn: looksSignedIn(cookies) };
};

const Enquiry = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Please type your name'), v.maxLength(80)),
	phone: v.pipe(v.string(), v.trim(), v.minLength(1, 'Please type your phone number')),
	message: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
	for_child: v.optional(v.string())
});

export const actions: Actions = {
	enquire: async ({ request, params, locals }) => {
		const form = Object.fromEntries(await request.formData());
		const parsed = v.safeParse(Enquiry, form);
		if (!parsed.success) return fail(400, { enquiry: { error: parsed.issues[0].message, values: form } });
		const phone = normalisePhone(parsed.output.phone);
		if (!phone) return fail(400, { enquiry: { error: 'Please check the phone number', values: form } });

		const profile = await classProfile(locals.db, params.slug);
		if (!profile) error(404, 'Class not found');
		const me = await locals.me();
		try {
			await sendEnquiry(locals.db, me?.id ?? null, profile.id, {
				name: parsed.output.name,
				phone,
				message: parsed.output.message || null,
				forChild: parsed.output.for_child === 'on'
			});
		} catch (err) {
			await resetDevConnection();
			console.error(err);
			return fail(500, { enquiry: { error: 'Could not send. Please try again.', values: form } });
		}
		return { enquiry: { sent: true } };
	}
};

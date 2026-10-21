import { fail, redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import { findCity } from '#lib/cities.ts';
import { AGE_GROUPS, LANGUAGES } from '#lib/options.ts';
import { normalisePhone } from '#lib/phone.ts';
import { resetDevConnection } from '#lib/server/db.ts';
import { createClass } from '#lib/server/services/classes.ts';
import { listActivities } from '#lib/server/services/search.ts';
import type { Actions, PageServerLoad } from './$types';

const AGES = AGE_GROUPS.map((a) => a.value);

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { me } = await parent();
	const activities = await listActivities(locals.db);
	const groups = activities
		.filter((a) => a.kind === 'category')
		.map((c) => ({ ...c, items: activities.filter((a) => a.parent_id === c.id) }));
	return { groups, myPhone: me.phone_e164 };
};

const time = v.pipe(v.string(), v.regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Please choose a time'));

const Schema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(2, 'Please type the class name'), v.maxLength(80)),
	activity1: v.pipe(v.string(), v.regex(/^\d+$/, 'Please choose what you teach')),
	activity2: v.optional(v.string()),
	activity3: v.optional(v.string()),
	city: v.pipe(v.string(), v.trim(), v.minLength(2, 'Please type your city'), v.maxLength(60)),
	address_line: v.pipe(v.string(), v.trim(), v.minLength(3, 'Please type the address'), v.maxLength(200)),
	locality: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
	postal_code: v.optional(v.pipe(v.string(), v.trim(), v.regex(/^(\d{6})?$/, 'PIN code has 6 numbers'))),
	lat: v.optional(v.string()),
	lng: v.optional(v.string()),
	whatsapp: v.optional(v.string()),
	show_whatsapp: v.optional(v.string()),
	phone: v.optional(v.string()),
	show_phone: v.optional(v.string()),
	upi_id: v.optional(v.pipe(v.string(), v.trim(), v.regex(/^([a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64})?$/, 'UPI ID looks like name@bank'))),
	batch_name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Please name the batch'), v.maxLength(60)),
	start: time,
	end: time,
	fee: v.optional(v.pipe(v.string(), v.regex(/^\d{0,6}$/, 'Fee must be a number in rupees'))),
	fee_period: v.picklist(['month', 'quarter', 'term', 'class'])
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const me = await locals.me();
		if (!me) redirect(303, '/login?next=/app/start');
		const fd = await request.formData();
		const raw = Object.fromEntries(fd);
		const values = { ...raw, days: fd.getAll('days').map(String), languages: fd.getAll('languages').map(String), ages: fd.getAll('ages').map(String) };
		const bad = (error: string) => fail(400, { error, values });

		const parsed = v.safeParse(Schema, raw);
		if (!parsed.success) return bad(parsed.issues[0].message);
		const f = parsed.output;

		const days = [...new Set(values.days.map(Number))].filter((d) => d >= 0 && d <= 6);
		if (!days.length) return bad('Please choose the days of the batch');
		if (f.end <= f.start) return bad('End time must be after start time');

		const whatsapp = f.whatsapp?.trim() ? normalisePhone(f.whatsapp) : null;
		if (f.whatsapp?.trim() && !whatsapp) return bad('Please check the WhatsApp number');
		const phone = f.phone?.trim() ? normalisePhone(f.phone) : null;
		if (f.phone?.trim() && !phone) return bad('Please check the phone number');

		let lat = Number(f.lat);
		let lng = Number(f.lng);
		let precise = Number.isFinite(lat) && Number.isFinite(lng) && f.lat !== '' && f.lng !== '';
		const city = findCity(f.city);
		if (!precise) {
			if (!city) return bad('We do not know this city yet. Choose one from the list, or tap "I am at my class now".');
			lat = city.lat;
			lng = city.lng;
			precise = false;
		}

		const activityIds = [f.activity1, f.activity2, f.activity3]
			.filter((x): x is string => Boolean(x && /^\d+$/.test(x)))
			.map(Number)
			.filter((x, i, all) => all.indexOf(x) === i);

		let created: { id: string };
		try {
			created = await createClass(locals.db, me.id, {
				name: f.name,
				activityIds,
				city: city?.name ?? f.city,
				state: city?.state ?? null,
				addressLine: f.address_line,
				locality: f.locality || null,
				postalCode: f.postal_code || null,
				lat,
				lng,
				precise,
				whatsapp,
				showWhatsapp: f.show_whatsapp === 'on',
				phone,
				showPhone: f.show_phone === 'on',
				teachingLanguages: values.languages.filter((l) => LANGUAGES.includes(l)),
				ageGroups: values.ages.filter((a) => AGES.includes(a)),
				upiId: f.upi_id || null,
				batch: {
					name: f.batch_name,
					days,
					start: f.start,
					end: f.end,
					feePaise: f.fee ? Number(f.fee) * 100 : null,
					feePeriod: f.fee_period
				}
			});
		} catch (err) {
			await resetDevConnection();
			console.error(err);
			return bad('Could not save the class. Please try again.');
		}
		redirect(303, `/app/c/${created.id}?new=1`);
	}
};

import { error, fail } from '@sveltejs/kit';
import { findCity } from '#lib/cities.ts';
import { AGE_GROUPS, LANGUAGES } from '#lib/options.ts';
import { normalisePhone } from '#lib/phone.ts';
import { attempt, on, str } from '#lib/server/form.ts';
import { requireManager } from '#lib/server/require.ts';
import { listActivities } from '#lib/server/services/search.ts';
import { loadSettings, saveAddress, saveDetails } from '#lib/server/services/settings.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { me, org } = await parent();
	requireManager(org.role);
	const [settings, activities] = await Promise.all([loadSettings(locals.db, me.id, org.id), listActivities(locals.db)]);
	if (!settings) error(404, 'Class not found');
	const groups = activities
		.filter((a) => a.kind === 'category')
		.map((c) => ({ ...c, items: activities.filter((a) => a.parent_id === c.id) }));
	return { settings, groups };
};

export const actions: Actions = {
	details: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const name = str(d, 'name');
		if (name.length < 2 || name.length > 80) return fail(400, { error: 'Please type the class name' });
		const about = str(d, 'about').slice(0, 2000) || null;
		const phone = str(d, 'phone') ? normalisePhone(str(d, 'phone')) : null;
		if (str(d, 'phone') && !phone) return fail(400, { error: 'Please check the phone number' });
		const whatsapp = str(d, 'whatsapp') ? normalisePhone(str(d, 'whatsapp')) : null;
		if (str(d, 'whatsapp') && !whatsapp) return fail(400, { error: 'Please check the WhatsApp number' });
		const email = str(d, 'email') || null;
		if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { error: 'Please check the email' });
		const upi = str(d, 'upi_id') || null;
		if (upi && !/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64}$/.test(upi)) return fail(400, { error: 'UPI ID looks like name@bank' });
		const dueDay = Number(str(d, 'fee_due_day') || 10);
		if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) return fail(400, { error: 'Fee due day must be 1 to 28' });
		const activityIds = ['activity1', 'activity2', 'activity3']
			.map((k) => str(d, k))
			.filter((x) => /^\d+$/.test(x))
			.map(Number)
			.filter((x, i, all) => all.indexOf(x) === i);
		if (!activityIds.length) return fail(400, { error: 'Please choose what you teach' });

		return attempt(
			() =>
				saveDetails(locals.db, me.id, params.orgId, {
					name,
					about,
					activityIds,
					phone,
					showPhone: on(d, 'show_phone'),
					whatsapp,
					showWhatsapp: on(d, 'show_whatsapp'),
					email,
					showEmail: on(d, 'show_email'),
					upiId: upi,
					teachingLanguages: d.getAll('languages').map(String).filter((l) => LANGUAGES.includes(l)),
					ageGroups: d.getAll('ages').map(String).filter((a) => AGE_GROUPS.some((g) => g.value === a)),
					womenOnly: on(d, 'women_only'),
					online: on(d, 'online'),
					feeDueDay: dueDay,
					published: on(d, 'published')
				}),
			'Saved.'
		);
	},

	address: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const addressLine = str(d, 'address_line');
		if (addressLine.length < 3) return fail(400, { error: 'Please type the address' });
		const cityTyped = str(d, 'city');
		const city = findCity(cityTyped);
		let lat = Number(str(d, 'lat'));
		let lng = Number(str(d, 'lng'));
		let precise = str(d, 'lat') !== '' && Number.isFinite(lat) && Number.isFinite(lng);
		if (!precise) {
			if (cityTyped.toLowerCase() === str(d, 'old_city').toLowerCase()) {
				lat = Number(str(d, 'old_lat'));
				lng = Number(str(d, 'old_lng'));
				precise = str(d, 'old_precise') === 'true';
			} else if (city) {
				lat = city.lat;
				lng = city.lng;
			} else {
				return fail(400, { error: 'Choose a city from the list, or tap "I am at my class now".' });
			}
		}
		const postal = str(d, 'postal_code');
		if (postal && !/^\d{6}$/.test(postal)) return fail(400, { error: 'PIN code has 6 numbers' });
		return attempt(
			() =>
				saveAddress(locals.db, me.id, params.orgId, str(d, 'branch'), {
					addressLine,
					locality: str(d, 'locality') || null,
					city: city?.name ?? cityTyped,
					state: city?.state ?? null,
					postalCode: postal || null,
					lat,
					lng,
					precise
				}),
			'Address saved.'
		);
	}
};

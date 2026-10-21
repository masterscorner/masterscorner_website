import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { normalisePhone } from '#lib/phone.ts';
import { googleEnabled } from '#lib/server/auth.ts';
import { resetDevConnection } from '#lib/server/db.ts';
import { devCodes } from '#lib/server/otp.ts';
import { allow } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

/** Only allow going back to a page on this site after signing in. */
function safeNext(value: string | null): string {
	return value && /^\/(?![\/\\])/.test(value) && !value.startsWith('/login') ? value : '/app';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = await locals.me();
	if (me) redirect(303, safeNext(url.searchParams.get('next')));
	return { googleEnabled, dev };
};

export const actions: Actions = {
	send: async ({ request, locals, getClientAddress }) => {
		const data = await request.formData();
		const typed = String(data.get('phone') ?? '');
		const phone = normalisePhone(typed);
		if (!phone) return fail(400, { step: 'phone' as const, phone: typed, error: 'Please type a 10 digit mobile number' });

		const ip = getClientAddress();
		const okPhone = await allow(locals.db, `otp:phone:${phone}`, 5, 600);
		const okIp = await allow(locals.db, `otp:ip:${ip}`, 20, 3600);
		if (!okPhone || !okIp) {
			return fail(429, { step: 'phone' as const, phone: typed, error: 'Too many tries. Please wait 10 minutes.' });
		}
		try {
			await locals.auth.api.sendPhoneNumberOTP({ body: { phoneNumber: phone }, headers: request.headers });
		} catch (err) {
			await resetDevConnection();
			console.error(err);
			return fail(502, { step: 'phone' as const, phone: typed, error: 'Could not send the code. Please try again.' });
		}
		// Development only: no SMS is sent, so show the code on the page.
		return { step: 'code' as const, phone, devCode: dev ? (devCodes.get(phone) ?? null) : null };
	},

	verify: async ({ request, locals, url }) => {
		const data = await request.formData();
		const phone = normalisePhone(String(data.get('phone') ?? ''));
		const code = String(data.get('code') ?? '').replace(/\D/g, '');
		if (!phone) return fail(400, { step: 'phone' as const, phone: '', error: 'Please type your number again' });
		if (code.length !== 6) return fail(400, { step: 'code' as const, phone, error: 'The code has 6 numbers' });
		try {
			await locals.auth.api.verifyPhoneNumber({ body: { phoneNumber: phone, code }, headers: request.headers });
		} catch {
			await resetDevConnection();
			return fail(400, { step: 'code' as const, phone, error: 'Wrong or old code. Check the message or send a new code.' });
		}
		redirect(303, safeNext(url.searchParams.get('next')));
	},

	google: async ({ locals, url, request }) => {
		if (!googleEnabled) return fail(404, { step: 'phone' as const, phone: '', error: 'Google sign-in is not available' });
		const res = await locals.auth.api.signInSocial({
			body: { provider: 'google', callbackURL: safeNext(url.searchParams.get('next')) },
			headers: request.headers
		});
		if (!res.url) return fail(502, { step: 'phone' as const, phone: '', error: 'Google sign-in failed' });
		redirect(303, res.url, { external: ['https://accounts.google.com'] });
	}
};

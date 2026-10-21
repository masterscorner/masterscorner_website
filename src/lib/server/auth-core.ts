// Better Auth setup with no SvelteKit imports, so scripts and tests can use it too.
import { betterAuth } from 'better-auth';
import { phoneNumber } from 'better-auth/plugins/phone-number';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Kysely } from 'kysely';
import { isE164 } from '../phone.ts';

export interface AuthOptions {
	db: Kysely<any>;
	secret: string;
	baseURL: string;
	google?: { clientId: string; clientSecret: string };
	sendOtp: (phone: string, code: string) => Promise<void>;
	/** Lets Better Auth set cookies through SvelteKit when called from server actions. */
	getRequestEvent?: () => RequestEvent;
}

export function createAuth(opts: AuthOptions) {
	return betterAuth({
		appName: 'MastersCorner',
		secret: opts.secret,
		baseURL: opts.baseURL,
		database: { db: opts.db, type: 'postgres', schemaName: 'mc_auth', casing: 'snake' },
		emailAndPassword: { enabled: false },
		socialProviders: opts.google
			? { google: { clientId: opts.google.clientId, clientSecret: opts.google.clientSecret } }
			: {},
		session: {
			// Stay signed in for 90 days; refresh the expiry at most once a day.
			expiresIn: 60 * 60 * 24 * 90,
			updateAge: 60 * 60 * 24
		},
		rateLimit: {
			enabled: true,
			storage: 'database',
			window: 60,
			max: 30,
			customRules: {
				'/phone-number/send-otp': { window: 600, max: 5 },
				'/phone-number/verify': { window: 600, max: 10 }
			}
		},
		advanced: {
			cookiePrefix: 'mc',
			database: { generateId: () => crypto.randomUUID() }
		},
		plugins: [
			phoneNumber({
				otpLength: 6,
				expiresIn: 300,
				allowedAttempts: 5,
				phoneNumberValidator: (p) => isE164(p),
				sendOTP: async ({ phoneNumber: phone, code }) => {
					await opts.sendOtp(phone, code);
				},
				signUpOnVerification: {
					// Phone-only accounts get a placeholder address that can never receive mail.
					getTempEmail: (phone) => `${phone.replace('+', '')}@phone.invalid`,
					getTempName: (phone) => phone
				}
			}),
			sveltekitCookies(
				opts.getRequestEvent ??
					(() => {
						throw new Error('Auth endpoints need a SvelteKit request');
					})
			)
		]
	});
}

export type Auth = ReturnType<typeof createAuth>;

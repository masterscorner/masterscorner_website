import { getRequestEvent } from '$app/server';
import {
	BETTER_AUTH_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	ORIGIN
} from '$app/env/private';
import { createAuth } from './auth-core.ts';
import type { DB } from './db-core.ts';
import { sendOtp } from './otp.ts';

export function authFor(db: DB) {
	return createAuth({
		db,
		secret: BETTER_AUTH_SECRET,
		baseURL: ORIGIN,
		google:
			GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
				? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET }
				: undefined,
		sendOtp,
		getRequestEvent
	});
}

export const googleEnabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

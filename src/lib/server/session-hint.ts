import type { Cookies } from '@sveltejs/kit';

/** Cheap check for showing "My page" instead of "Sign in" without a database lookup. */
export function looksSignedIn(cookies: Cookies): boolean {
	return Boolean(cookies.get('mc.session_token') ?? cookies.get('__Secure-mc.session_token'));
}

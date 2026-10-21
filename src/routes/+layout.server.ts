import { looksSignedIn } from '#lib/server/session-hint.ts';
import type { LayoutServerLoad } from './$types';

// For the header on every page: the city chosen last time and whether someone is signed in. No database call.
export const load: LayoutServerLoad = async ({ cookies }) => ({ headerCity: cookies.get('mc_city') ?? '', headerSignedIn: looksSignedIn(cookies) });

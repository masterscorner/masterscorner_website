import type { LayoutServerLoad } from './$types';

// The city the visitor chose last time (shown in the header). No database call.
export const load: LayoutServerLoad = async ({ cookies }) => ({ headerCity: cookies.get('mc_city') ?? '' });

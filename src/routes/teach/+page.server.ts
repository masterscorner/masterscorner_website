import { looksSignedIn } from '#lib/server/session-hint.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
	const signedIn = looksSignedIn(cookies);
	if (!signedIn) setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=3600' });
	return { signedIn };
};

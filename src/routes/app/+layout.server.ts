import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const me = await locals.me();
	const here = url.pathname + url.search;
	if (!me) redirect(303, `/login?next=${encodeURIComponent(here)}`);
	if (me.needsWelcome && url.pathname !== '/app/welcome') redirect(303, `/app/welcome?next=${encodeURIComponent(here)}`);
	return { me };
};

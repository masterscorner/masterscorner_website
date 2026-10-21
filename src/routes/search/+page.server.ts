import { findCity } from '#lib/cities.ts';
import { resolveQuery } from '#lib/search-text.ts';
import { listActivities, searchClasses } from '#lib/server/services/search.ts';
import { looksSignedIn } from '#lib/server/session-hint.ts';
import type { PageServerLoad } from './$types';

const PAGE = 20;

function num(v: string | null): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export const load: PageServerLoad = async ({ url, locals, cookies, setHeaders }) => {
	const typed = url.searchParams.get('q')?.trim() ?? '';
	let activity = url.searchParams.get('activity') || null;
	const cityParam = url.searchParams.get('city')?.trim() || '';
	const womenOnly = url.searchParams.get('women') === '1';
	const online = url.searchParams.get('online') === '1';
	const page = Math.max(1, Math.min(20, Number(url.searchParams.get('page') ?? 1) || 1));
	let lat = num(url.searchParams.get('lat'));
	let lng = num(url.searchParams.get('lng'));
	let placeLabel = 'Near you';

	if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
		lat = lng = null;
		const city = findCity(cityParam || cookies.get('mc_city') || '');
		if (city) {
			lat = city.lat;
			lng = city.lng;
			placeLabel = city.name;
			cookies.set('mc_city', city.name, { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: false, sameSite: 'lax' });
		}
	}

	const activities = await listActivities(locals.db);
	let textQuery: string | null = null;
	if (typed && !activity) {
		const resolved = resolveQuery(typed, activities);
		activity = resolved.activity;
		textQuery = resolved.q;
	}
	const chosen = activities.find((a) => a.slug === activity) ?? null;
	const suggestions = [...new Set(activities.filter((a) => a.kind !== 'style').map((a) => a.name))];
	const categories = activities.filter((a) => a.kind === 'category');

	if (lat == null || lng == null) {
		return { needsPlace: true as const, cityTyped: cityParam, chosen, categories, typed, suggestions, signedIn: looksSignedIn(cookies) };
	}

	const hits = await searchClasses(locals.db, {
		lat,
		lng,
		radiusKm: 25,
		activity,
		q: textQuery,
		womenOnly,
		online,
		limit: PAGE * page
	});
	setHeaders({ 'cache-control': 'public, max-age=60, s-maxage=120' });
	return {
		needsPlace: false as const,
		hits,
		hasMore: hits.length === PAGE * page,
		page,
		placeLabel,
		chosen,
		categories,
		filters: { womenOnly, online },
		typed,
		textQuery,
		suggestions,
		signedIn: looksSignedIn(cookies)
	};
};

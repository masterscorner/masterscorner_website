import { findCity } from '#lib/cities.ts';
import { categoryCounts, listActivities, searchClasses } from '#lib/server/services/search.ts';
import { looksSignedIn } from '#lib/server/session-hint.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, setHeaders }) => {
	const activities = await listActivities(locals.db);
	const signedIn = looksSignedIn(cookies);
	const city = findCity(cookies.get('mc_city') ?? '');
	const [nearby, counts] = await Promise.all([
		city ? searchClasses(locals.db, { lat: city.lat, lng: city.lng, radiusKm: 25, limit: 8 }) : Promise.resolve([]),
		categoryCounts(locals.db, city ? { lat: city.lat, lng: city.lng, radiusKm: 25 } : undefined)
	]);
	if (!signedIn && !city) setHeaders({ 'cache-control': 'public, max-age=60, s-maxage=300' });
	return {
		signedIn,
		city: city?.name ?? '',
		nearby,
		counts,
		categories: activities.filter((a) => a.kind === 'category'),
		suggestions: [...new Set(activities.filter((a) => a.kind !== 'style').map((a) => a.name))],
		groups: activities
			.filter((a) => a.kind === 'category')
			.map((c) => ({ ...c, items: activities.filter((a) => a.parent_id === c.id) })),
		popular: ['karate', 'bharatanatyam', 'cricket', 'carnatic-vocal', 'yoga', 'badminton', 'swimming', 'silambam']
			.map((slug) => activities.find((a) => a.slug === slug))
			.filter((a) => a !== undefined)
	};
};

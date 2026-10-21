// Turns what a person types ("karate classes", "bharathanatyam", "Sri Murugan") into a search:
// an activity filter when it names an activity, otherwise a text search on class names and areas.

export interface ActivityName {
	slug: string;
	name: string;
}

// Common spellings people type in India -> activity slug.
const ALIASES: Record<string, string> = {
	bharathanatyam: 'bharatanatyam',
	bharatnatyam: 'bharatanatyam',
	bharathnatyam: 'bharatanatyam',
	natyam: 'bharatanatyam',
	kalari: 'kalaripayattu',
	kalaripayatu: 'kalaripayattu',
	silambattam: 'silambam',
	kungfu: 'kung-fu',
	'kung fu': 'kung-fu',
	tkd: 'taekwondo',
	'tae kwon do': 'taekwondo',
	'ju jitsu': 'bjj',
	'jiu jitsu': 'bjj',
	jujitsu: 'bjj',
	'self defense': 'self-defence',
	kushti: 'wrestling',
	carnatic: 'carnatic-vocal',
	hindustani: 'hindustani-vocal',
	singing: 'carnatic-vocal',
	vocal: 'carnatic-vocal',
	piano: 'keyboard',
	gym: 'gym-training',
	workout: 'gym-training',
	skate: 'skating',
	swim: 'swimming',
	'table tennis': 'table-tennis',
	'ping pong': 'table-tennis',
	tt: 'table-tennis',
	shuttle: 'badminton',
	drawing: 'drawing',
	art: 'arts',
	sports: 'team-sports',
	martial: 'martial-arts',
	'martial art': 'martial-arts'
};

const NOISE = /\b(classes?|class|academy|coaching|training|lessons?|school|near me|nearby|for kids|for children|for adults|in [a-z ]+)$/g;

function clean(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9 ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(NOISE, '')
		.trim();
}

export function resolveQuery(text: string, activities: ActivityName[]): { activity: string | null; q: string | null } {
	const raw = text.trim();
	if (!raw) return { activity: null, q: null };
	const t = clean(raw);
	if (!t) return { activity: null, q: null };

	const bySlug = new Map(activities.map((a) => [a.slug, a]));
	if (ALIASES[t] && bySlug.has(ALIASES[t])) return { activity: ALIASES[t], q: null };

	const exact = activities.find((a) => clean(a.name) === t || a.slug === t.replace(/ /g, '-'));
	if (exact) return { activity: exact.slug, q: null };

	// "kathak dance" or "dance" in "Kathak dance": a whole word of the typed text matches an activity
	if (t.length >= 4) {
		const starts = activities.find((a) => clean(a.name).startsWith(t));
		if (starts) return { activity: starts.slug, q: null };
		for (const word of t.split(' ').filter((w) => w.length >= 4)) {
			if (ALIASES[word] && bySlug.has(ALIASES[word])) return { activity: ALIASES[word], q: null };
			const hit = activities.find((a) => clean(a.name) === word || clean(a.name).split(' ')[0] === word);
			if (hit) return { activity: hit.slug, q: null };
		}
	}
	return { activity: null, q: raw.slice(0, 60) };
}

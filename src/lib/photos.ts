// Photos used across the site. All from Pexels (free for commercial use, no credit required:
// https://www.pexels.com/license/). While developing they load from Pexels' image CDN.
// `npm run photos` downloads them into static/photos so the site serves its own copies (do this before launch).
import local from './photos-local.json' with { type: 'json' };

export interface Photo {
	id: number; // Pexels photo id
	alt: string;
	/** where to keep the subject when cropped (CSS object-position) */
	focus?: string;
}

export const PHOTOS = {
	hero: { id: 12159154, alt: 'A smiling mother and her young child', focus: '40% 40%' },
	parents: { id: 9345693, alt: 'A mother and son looking at a phone together', focus: '50% 35%' },
	masters: { id: 6102858, alt: 'A smiling teacher', focus: '50% 30%' },
	'martial-arts': { id: 40103577, alt: 'A karate master showing a form while students watch', focus: '45% 40%' },
	dance: { id: 14602419, alt: 'A Bharatanatyam dancer on stage', focus: '50% 30%' },
	music: { id: 10491559, alt: 'A young girl in traditional dress with a veena', focus: '50% 35%' },
	yoga: { id: 32661595, alt: 'A woman doing a yoga pose outdoors', focus: '50% 40%' },
	fitness: { id: 37000634, alt: 'Girls exercising together in a park', focus: '50% 45%' },
	'team-sports': { id: 13509819, alt: 'Boys playing a cricket match', focus: '50% 40%' },
	'racket-sports': { id: 7351720, alt: 'A girl playing badminton', focus: '50% 30%' },
	'water-sports': { id: 31522680, alt: 'A swimming coach teaching a child', focus: '50% 40%' },
	athletics: { id: 11344317, alt: 'Children running in a field', focus: '50% 50%' },
	arts: { id: 37190695, alt: 'Children drawing in an art class', focus: '50% 50%' },
	'mind-games': { id: 7104386, alt: 'A girl playing chess', focus: '50% 35%' }
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;
export const WIDTHS = [480, 960, 1600] as const;
const isLocal = (local as { local?: boolean }).local === true;

export function photoUrl(key: PhotoKey, width: (typeof WIDTHS)[number] = 960): string {
	if (isLocal) return `/photos/${key}-${width}.jpg`;
	const id = PHOTOS[key].id;
	return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

export function photoSrcset(key: PhotoKey, max: (typeof WIDTHS)[number] = 1600): string {
	return WIDTHS.filter((w) => w <= max)
		.map((w) => `${photoUrl(key, w)} ${w}w`)
		.join(', ');
}

/** Category slug → photo key (falls back to the hero photo). */
export function categoryPhoto(slug: string | null | undefined): PhotoKey {
	return slug && slug in PHOTOS ? (slug as PhotoKey) : 'hero';
}

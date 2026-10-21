// A hue per activity category, used for soft background tints (works in light and dark mode).
export const CATEGORY_HUE: Record<string, number> = {
	'martial-arts': 12,
	dance: 325,
	music: 245,
	yoga: 150,
	fitness: 38,
	'team-sports': 205,
	'racket-sports': 95,
	'water-sports': 188,
	athletics: 25,
	arts: 280,
	'mind-games': 230
};

export function hueFor(category: string | null | undefined): number {
	return (category ? CATEGORY_HUE[category] : undefined) ?? 245;
}

/** Short line shown on the big category banner on the home page. */
export const CATEGORY_LINE: Record<string, string> = {
	'martial-arts': 'Confidence starts here.',
	dance: 'Grace, rhythm and joy.',
	music: 'Find your voice and your rhythm.',
	yoga: 'Calm mind, strong body.',
	fitness: 'Get fit together.',
	'team-sports': 'Play as a team. Grow as a team.',
	'racket-sports': 'Quick feet, sharp mind.',
	'water-sports': 'Learn to swim safely.',
	athletics: 'Run, jump, grow.',
	arts: 'Draw, paint, create.',
	'mind-games': 'Think ahead. Play smart.'
};

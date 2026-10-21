import { describe, expect, it } from 'vitest';
import { resolveQuery } from '../src/lib/search-text.ts';

const acts = [
	{ slug: 'martial-arts', name: 'Martial arts' },
	{ slug: 'dance', name: 'Dance' },
	{ slug: 'karate', name: 'Karate' },
	{ slug: 'bharatanatyam', name: 'Bharatanatyam' },
	{ slug: 'kathak', name: 'Kathak' },
	{ slug: 'kalaripayattu', name: 'Kalaripayattu' },
	{ slug: 'table-tennis', name: 'Table tennis' },
	{ slug: 'carnatic-vocal', name: 'Carnatic vocal' }
];

describe('typed search', () => {
	it.each([
		['karate', 'karate'],
		['Karate classes', 'karate'],
		['bharathanatyam', 'bharatanatyam'],
		['Kathak dance', 'kathak'],
		['dance class near me', 'dance'],
		['kalari', 'kalaripayattu'],
		['table tennis', 'table-tennis'],
		['carnatic', 'carnatic-vocal'],
		['Bharat', 'bharatanatyam']
	])('"%s" finds the activity %s', (typed, slug) => {
		expect(resolveQuery(typed, acts)).toEqual({ activity: slug, q: null });
	});

	it('searches class names when it is not an activity', () => {
		expect(resolveQuery('Sri Murugan', acts)).toEqual({ activity: null, q: 'Sri Murugan' });
	});

	it('ignores empty text', () => {
		expect(resolveQuery('   ', acts)).toEqual({ activity: null, q: null });
	});
});

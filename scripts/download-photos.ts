// npm run photos — saves every photo in src/lib/photos.ts into static/photos (3 sizes each),
// then the site serves its own copies instead of loading them from Pexels.
// Run on a computer with normal internet (your own PC). Safe to run again.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { PHOTOS, WIDTHS } from '../src/lib/photos.ts';

mkdirSync('static/photos', { recursive: true });
let ok = 0;
for (const [key, p] of Object.entries(PHOTOS)) {
	for (const w of WIDTHS) {
		const file = `static/photos/${key}-${w}.jpg`;
		if (existsSync(file)) {
			ok++;
			continue;
		}
		const url = `https://images.pexels.com/photos/${p.id}/pexels-photo-${p.id}.jpeg?auto=compress&cs=tinysrgb&fm=jpg&w=${w}`;
		const res = await fetch(url).catch(() => null);
		if (!res) {
			console.error('No internet connection to images.pexels.com. Try again later.');
			process.exit(1);
		}
		if (!res.ok) {
			console.error(`Could not download ${key} (${w}px): ${res.status}`);
			process.exit(1);
		}
		writeFileSync(file, Buffer.from(await res.arrayBuffer()));
		ok++;
		console.log(`saved ${file}`);
	}
}
writeFileSync('src/lib/photos-local.json', JSON.stringify({ local: true }) + '\n');
console.log(`Done: ${ok} files. The site now uses its own copies.`);

// npm run budget (after npm run build): fails when the JavaScript a phone downloads grows past the budget.
// Measures the app's start files plus the heaviest single page, gzipped.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 150;
const root = '.svelte-kit/output/client/_app/immutable';

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((f) => {
		const p = join(dir, f);
		return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
	});
}

const gz = (file: string) => gzipSync(readFileSync(file)).length / 1024;
const files = walk(root);
const entry = files.filter((f) => f.includes('/entry/'));
const shared = files.filter((f) => f.includes('/chunks/'));
const nodes = files.filter((f) => f.includes('/nodes/'));

const entryKb = entry.reduce((s, f) => s + gz(f), 0);
const sharedKb = shared.reduce((s, f) => s + gz(f), 0);
const heaviestNode = nodes.map((f) => ({ f, kb: gz(f) })).sort((a, b) => b.kb - a.kb)[0];
// Worst case: every shared chunk + start files + heaviest page.
const worst = entryKb + sharedKb + (heaviestNode?.kb ?? 0);

console.log(`start files ${entryKb.toFixed(1)} KB, shared chunks ${sharedKb.toFixed(1)} KB, heaviest page ${heaviestNode?.kb.toFixed(1)} KB (${heaviestNode?.f.split('/').pop()})`);
console.log(`worst-case first load: ${worst.toFixed(1)} KB gzipped (budget ${BUDGET_KB} KB)`);
if (worst > BUDGET_KB) {
	console.error('Over budget.');
	process.exit(1);
}

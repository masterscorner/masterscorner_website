// Makes the app open fast on repeat visits and work without internet.
// Build files and static files are cached on install; pages are network-first with a cached fallback.
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self } from '$app/service-worker';

const STATIC = `static-${version}`;
const PAGES = 'pages-v1';
const precache = [...immutable.map((f) => f.path), ...assets.map((f) => f.path)].map((p) => (p.startsWith('/') ? p : `/${p}`));
const precacheSet = new Set(precache);

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(STATIC)
			.then((c) => c.addAll(precache))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k.startsWith('static-') && k !== STATIC).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

// Signing out clears saved pages, so the next person using this phone cannot see them.
self.addEventListener('message', (event) => {
	if (event.data === 'clear-pages') event.waitUntil(caches.delete(PAGES));
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

	if (precacheSet.has(url.pathname)) {
		event.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)));
		return;
	}

	const isPage = req.mode === 'navigate' || url.pathname.endsWith('/__data.json');
	if (!isPage) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(PAGES);
			try {
				const res = await fetch(req);
				if (res.ok && res.type === 'basic') cache.put(req, res.clone());
				return res;
			} catch {
				const hit = await cache.match(req);
				if (hit) return hit;
				return new Response(
					'<!doctype html><meta name="viewport" content="width=device-width"><title>No internet</title><body style="font-family:system-ui;padding:24px;color:#1b2040"><h1 style="color:#18225a">No internet</h1><p>This page is not saved on your phone yet. Connect to the internet and try again.</p></body>',
					{ status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
				);
			}
		})()
	);
});

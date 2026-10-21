<script lang="ts">
	import '../app.css';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import { markInside } from '#lib/nav-history.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	afterNavigate(({ from }) => {
		if (from) markInside();
	});

	// Smooth page changes where the browser supports it (Chrome on Android does).
	onNavigate((navigation) => {
		if (!document.startViewTransition || navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>MastersCorner: find a class near you</title>
	<meta name="description" content="Find karate, dance, music, yoga and sports classes near you. Teachers run attendance, fees and students for free." />
</svelte:head>

{@render children()}

<script lang="ts">
	import type { Snippet } from 'svelte';
	import SiteFooter from './SiteFooter.svelte';
	import SiteHeader from './SiteHeader.svelte';

	let { title, updated, children }: { title: string; updated: string; children: Snippet } = $props();
</script>

<svelte:head><title>{title} | MastersCorner</title></svelte:head>

<SiteHeader />
<main class="legal mx-auto max-w-2xl px-4">
	<h1 class="text-[1.9rem]">{title}</h1>
	<p class="mt-1 text-sm text-ink-soft">Last updated {updated}. Draft under legal review.</p>
	{@render children()}
</main>
<SiteFooter />

<style>
	.legal :global(h2) {
		margin-top: 2rem;
		font-size: 1.25rem;
	}
	.legal :global(p),
	.legal :global(ul) {
		margin-top: 0.75rem;
		max-width: 65ch;
	}
	.legal :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
		display: grid;
		gap: 0.35rem;
	}
	.legal :global(a) {
		text-decoration: underline;
	}
</style>

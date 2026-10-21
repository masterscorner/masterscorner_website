<script lang="ts">
	import ClassCard from '#lib/components/ClassCard.svelte';
	import SearchBar from '#lib/components/SearchBar.svelte';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import { categoryPhoto, PHOTOS, photoUrl } from '#lib/photos.ts';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const what = $derived(data.chosen ? data.chosen.name : !data.needsPlace && data.textQuery ? `"${data.textQuery}"` : 'Classes');

	function href(changes: Record<string, string | null>) {
		const u = new URL(page.url.href);
		for (const [k, v] of Object.entries(changes)) {
			if (v == null) u.searchParams.delete(k);
			else u.searchParams.set(k, v);
		}
		u.searchParams.delete('page');
		return `/search${u.search}`;
	}

	function more(next: number) {
		const u = new URL(page.url.href);
		u.searchParams.set('page', String(next));
		return `/search${u.search}`;
	}
</script>

<svelte:head>
	<title>{data.chosen?.name ?? 'Classes'} near you | MastersCorner</title>
</svelte:head>

<SiteHeader signedIn={data.signedIn} />

<main class="mx-auto max-w-6xl px-4 pt-5">
	{#if data.needsPlace}
		<h1 class="text-[1.7rem]">{what}: where should we look?</h1>
		{#if data.cityTyped}<p class="error-text mt-2">We do not know "{data.cityTyped}" yet. Pick a city from the list or tap Near me.</p>{/if}
		<div class="mt-4"><SearchBar q={data.typed || (data.chosen?.name ?? '')} suggestions={data.suggestions} autofocusCity /></div>
	{:else}
		<SearchBar city={data.placeLabel === 'Near you' ? '' : data.placeLabel} q={data.typed || (data.chosen?.name ?? '')} suggestions={data.suggestions} />

		<nav class="rail mt-5 -mx-4 gap-2 px-4 pb-1" aria-label="Choose a category">
			{#each data.categories as c (c.id)}
				{@const k = categoryPhoto(c.slug)}
				<a class="cat" aria-current={data.chosen?.slug === c.slug ? 'true' : undefined} href={href({ activity: data.chosen?.slug === c.slug ? null : c.slug, q: null })}>
					<img src={photoUrl(k, 480)} alt="" loading="lazy" style:object-position={PHOTOS[k].focus} />{c.name}
				</a>
			{/each}
		</nav>

		<div class="mt-5 flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 class="text-[1.6rem] sm:text-[1.9rem]">{what} near {data.placeLabel === 'Near you' ? 'you' : data.placeLabel}</h1>
				<p class="text-ink-soft">{data.hits.length === 0 ? 'No classes found yet.' : `${data.hits.length}${data.hasMore ? '+' : ''} found, nearest first`}</p>
			</div>
			<div class="flex gap-2">
				<a class="chip" class:on={data.filters.womenOnly} href={href({ women: data.filters.womenOnly ? null : '1' })}>Women only</a>
				<a class="chip" class:on={data.filters.online} href={href({ online: data.filters.online ? null : '1' })}>Online</a>
			</div>
		</div>

		{#if data.hits.length === 0}
			<div class="panel mt-6 p-6">
				<p class="font-semibold">No {data.chosen?.name.toLowerCase() ?? ''} classes listed here yet.</p>
				<p class="mt-1 text-ink-soft">Try another activity or a bigger city nearby. Know a master? Ask them to list their class. It is free.</p>
				<a href="/teach" class="btn btn-quiet mt-4">I teach a class</a>
			</div>
		{:else}
			<ul class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.hits as hit (hit.id)}
					<li class="grid"><ClassCard {hit} /></li>
				{/each}
			</ul>
			{#if data.hasMore}
				<a class="btn btn-quiet mt-5 w-full" href={more(data.page + 1)}>Show more</a>
			{/if}
		{/if}
	{/if}
</main>

<SiteFooter />

<style>
	.cat {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 46px;
		padding: 0.25rem 1rem 0.25rem 0.25rem;
		border-radius: 999px;
		border: 1.5px solid var(--color-line);
		background: var(--color-surface);
		font-weight: 700;
		font-size: 0.92rem;
		color: var(--color-ink);
		text-decoration: none;
		white-space: nowrap;
	}
	.cat img {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		object-fit: cover;
	}
	.cat[aria-current='true'] {
		background: var(--color-brand);
		border-color: var(--color-brand);
		color: white;
	}
</style>

<script lang="ts">
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Star from '@lucide/svelte/icons/star';
	import { distance, rupees } from '#lib/format.ts';
	import { categoryPhoto, PHOTOS, photoSrcset, photoUrl } from '#lib/photos.ts';
	import LevelStripe from './LevelStripe.svelte';

	interface Hit {
		slug: string;
		name: string;
		locality: string | null;
		city: string;
		distance_m: number;
		rating_avg: string | null;
		rating_count: number;
		fee_min_paise: number | null;
		women_only: boolean;
		online: boolean;
		teaching_languages: string[];
		activities: { name: string; emoji: string | null; cat: string }[];
		level_colors: string[];
		cover_key?: string | null;
		is_sample?: boolean;
	}
	let { hit, compact = false }: { hit: Hit; compact?: boolean } = $props();
	const fallback = $derived(categoryPhoto(hit.activities[0]?.cat));
</script>

<a href="/c/{hit.slug}" class="card" class:compact>
	<div class="cover">
		{#if hit.cover_key}
			<img src="/media/{hit.cover_key}" alt="" loading="lazy" decoding="async" />
		{:else}
			<img
				src={photoUrl(fallback, 480)}
				srcset={photoSrcset(fallback, 960)}
				sizes="(min-width: 640px) 20rem, 90vw"
				alt=""
				loading="lazy"
				decoding="async"
				style:object-position={PHOTOS[fallback].focus}
			/>
		{/if}
		<span class="dist tnum"><MapPin size={13} aria-hidden="true" />{distance(hit.distance_m)}</span>
		{#if hit.is_sample}<span class="sample" title="Example listing to show how MastersCorner works">Sample</span>{/if}
		<div class="stripe"><LevelStripe colors={hit.level_colors} height={5} /></div>
	</div>
	<div class="body">
		<div class="flex items-start justify-between gap-2">
			<h3 class="name">{hit.name}</h3>
			{#if hit.rating_count > 0}
				<span class="rate tnum" aria-label="Rated {Number(hit.rating_avg).toFixed(1)} out of 5 by {hit.rating_count} students">
					{Number(hit.rating_avg).toFixed(1)}<Star size={12} class="fill-white" aria-hidden="true" />
				</span>
			{/if}
		</div>
		<p class="acts">{hit.activities.map((a) => a.name).join(' · ')}</p>
		<p class="where"><span class="truncate">{hit.locality ? `${hit.locality}, ` : ''}{hit.city}</span></p>
		<div class="foot">
			{#if hit.fee_min_paise != null}
				<span class="price tnum">{rupees(hit.fee_min_paise)}<small>&nbsp;onwards</small></span>
			{:else}
				<span class="price muted">Ask for fees</span>
			{/if}
			<span class="flex flex-wrap justify-end gap-1">
				{#if hit.women_only}<span class="tag">Women only</span>{/if}
				{#if hit.online}<span class="tag">Online</span>{/if}
				{#if hit.rating_count === 0}<span class="tag new">New</span>{/if}
			</span>
		</div>
		{#if hit.teaching_languages.length}<p class="langs">Teaches in {hit.teaching_languages.slice(0, 3).join(', ')}</p>{/if}
	</div>
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-card);
		color: var(--color-ink);
		text-decoration: none;
		transition:
			transform 160ms ease,
			box-shadow 200ms ease;
	}
	.card:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-float);
	}
	.card:active {
		transform: scale(0.985);
	}
	.compact {
		width: 17.5rem;
	}
	.cover {
		position: relative;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		background: var(--color-indigo-soft);
	}
	.cover img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.dist {
		position: absolute;
		left: 0.7rem;
		top: 0.7rem;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.22rem 0.6rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 800;
		background: rgb(255 255 255 / 0.95);
		color: #10233f;
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.12);
	}
	.sample {
		position: absolute;
		right: 0.7rem;
		top: 0.7rem;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		background: #10294a;
		color: white;
	}
	.stripe {
		position: absolute;
		inset: auto 0 0 0;
	}
	.body {
		display: grid;
		gap: 0.25rem;
		padding: 0.85rem 1rem 1rem;
	}
	.name {
		font-size: 1.08rem;
		line-height: 1.25;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.rate {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.15rem 0.45rem;
		border-radius: 7px;
		background: #138a4a;
		color: white;
		font-size: 0.8rem;
		font-weight: 800;
	}
	.acts {
		font-weight: 700;
		color: var(--color-indigo);
		font-size: 0.9rem;
	}
	.where {
		display: flex;
		color: var(--color-ink-soft);
		font-size: 0.88rem;
		min-width: 0;
	}
	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.45rem;
		padding-top: 0.6rem;
		border-top: 1px dashed var(--color-line);
	}
	.price {
		font-weight: 800;
		font-size: 1.05rem;
		color: var(--color-ink);
	}
	.price small {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink-soft);
	}
	.price.muted {
		font-size: 0.88rem;
		color: var(--color-ink-soft);
	}
	.tag {
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		background: var(--color-indigo-soft);
		color: var(--color-indigo);
		font-weight: 800;
		font-size: 0.74rem;
	}
	.tag.new {
		background: var(--color-haldi-soft);
		color: var(--color-due);
	}
	.langs {
		font-size: 0.78rem;
		color: var(--color-ink-soft);
	}
</style>

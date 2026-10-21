<script lang="ts">
	import { page } from '$app/state';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Star from '@lucide/svelte/icons/star';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
	import ClassCard from '#lib/components/ClassCard.svelte';
	import PhoneMock from '#lib/components/PhoneMock.svelte';
	import Photo from '#lib/components/Photo.svelte';
	import SearchBar from '#lib/components/SearchBar.svelte';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import { CATEGORY_LINE } from '#lib/categories.ts';
	import { categoryPhoto, photoSrcset, photoUrl, PHOTOS } from '#lib/photos.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let chosen = $state('martial-arts');
	const cat = $derived(data.categories.find((c) => c.slug === chosen) ?? data.categories[0]);
	const catKey = $derived(categoryPhoto(cat?.slug));
	const count = $derived(cat ? (data.counts[cat.slug] ?? 0) : 0);
	const askPlace = $derived(page.url.searchParams.get('place') === '1');
</script>

<SiteHeader signedIn={data.signedIn} />

<main>
	<!-- Hero -->
	<section class="mx-auto grid max-w-6xl items-center gap-5 px-4 pt-6 md:grid-cols-[1.15fr_1fr] md:pt-10">
		<div>
			<h1 class="hero-title">Find the right class.<br /><span class="text-brand">Close to home.</span></h1>
			<p class="mt-3 max-w-[36ch] text-[1.08rem] text-ink-soft">Classes for children and adults. Learn from experienced masters near you.</p>
		</div>
		<div class="hero-photo">
			<Photo key="hero" eager sizes="(min-width: 768px) 560px, 92vw" class="h-full w-full" />
			<p class="hand note" aria-hidden="true">Good habits,<br />brighter tomorrows</p>
		</div>
	</section>

	<!-- Search -->
	<section id="find" class="mx-auto mt-5 max-w-6xl scroll-mt-24 px-4">
		<SearchBar city={data.city} suggestions={data.suggestions} autofocusCity={askPlace} />
		<p class="mt-2 flex items-center gap-1.5 text-sm font-semibold text-present"><ShieldCheck size={16} aria-hidden="true" /> Free for everyone. No sign-up needed to search.</p>
	</section>

	<!-- Categories: photo pills switch the big banner -->
	<section class="mx-auto mt-8 max-w-6xl px-4" aria-labelledby="learn-h">
		<div class="flex items-end justify-between gap-3">
			<h2 id="learn-h" class="text-[1.4rem]">What would you like to learn?</h2>
			<p class="hand hidden text-[1.25rem] text-ink-soft md:block" aria-hidden="true">Choose one, the picture changes ↓</p>
		</div>
		<div class="rail cats mt-4 -mx-4 px-4 pb-2" role="tablist" aria-label="Categories">
			{#each data.categories as c (c.id)}
				{@const k = categoryPhoto(c.slug)}
				<button role="tab" class="cat" aria-selected={chosen === c.slug} onclick={() => (chosen = c.slug)}>
					<img class="thumb" src={photoUrl(k, 480)} alt="" loading="lazy" decoding="async" style:object-position={PHOTOS[k].focus} />
					<span>{c.name}</span>
				</button>
			{/each}
		</div>

		{#if cat}
			<a href="/search?activity={cat.slug}" class="banner mt-4" role="tabpanel" aria-label={cat.name}>
				{#key catKey}
					<img class="banner-img" src={photoUrl(catKey, 960)} srcset={photoSrcset(catKey)} sizes="(min-width: 1152px) 1120px, 100vw" alt={PHOTOS[catKey].alt} style:object-position={PHOTOS[catKey].focus} />
				{/key}
				<div class="banner-text">
					<h3 class="text-[2.2rem] leading-none text-white sm:text-[3.4rem]">{cat.name}</h3>
					<p class="mt-2 text-[1.1rem] font-semibold text-white/90 sm:text-[1.4rem]">{CATEGORY_LINE[cat.slug] ?? 'Start learning today.'}</p>
					{#if count > 0}<p class="mt-1 text-sm font-semibold text-white/80">{count} {count === 1 ? 'class' : 'classes'}{data.city ? ` in and around ${data.city}` : ' on MastersCorner'}</p>{/if}
					<span class="btn btn-primary mt-4 w-fit">Explore {cat.name} <ArrowRight size={19} aria-hidden="true" /></span>
				</div>
			</a>
		{/if}
	</section>

	<!-- Three promises -->
	<section class="mx-auto mt-6 max-w-6xl px-4">
		<ul class="promises panel">
			<li>
				<img src={photoUrl('athletics', 480)} alt="" loading="lazy" />
				<span><strong>Classes near you</strong><small>Real timings, fees and photos.</small></span>
			</li>
			<li>
				<img src={photoUrl('parents', 480)} alt="" loading="lazy" />
				<span><strong>Free to use</strong><small>No charges for families or masters right now.</small></span>
			</li>
			<li>
				<img src={photoUrl('martial-arts', 480)} alt="" loading="lazy" />
				<span><strong>See your child's progress</strong><small>Attendance, belts and fees in one place.</small></span>
			</li>
		</ul>
	</section>

	{#if data.nearby.length}
		<section class="mx-auto mt-10 max-w-6xl px-4" aria-labelledby="near">
			<div class="flex items-end justify-between gap-3">
				<h2 id="near" class="text-[1.4rem]">Classes in {data.city}</h2>
				<a href="/search?city={encodeURIComponent(data.city)}" class="flex items-center font-bold text-indigo">See all <ChevronRight size={18} aria-hidden="true" /></a>
			</div>
			<ul class="rail mt-4 -mx-4 px-4 pb-4">
				{#each data.nearby as hit (hit.id)}
					<li><ClassCard {hit} compact /></li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Who is it for -->
	<section class="mx-auto mt-8 grid max-w-6xl gap-4 px-4 md:grid-cols-2">
		<a href="/search" class="who parents">
			<Photo key="parents" sizes="(min-width: 768px) 220px, 40vw" decorative class="who-img" />
			<span class="who-text">
				<strong>For parents and students</strong>
				<small>Find classes, meet masters and pick the right fit for your goals.</small>
				<span class="who-go" aria-hidden="true"><ChevronRight size={20} /></span>
			</span>
		</a>
		<a href="/teach" class="who masters">
			<Photo key="masters" sizes="(min-width: 768px) 220px, 40vw" decorative class="who-img" />
			<span class="who-text">
				<strong>For masters and academies</strong>
				<small>Show your classes, reach more learners and run your class from your phone.</small>
				<span class="btn btn-primary mt-2 min-h-11 w-fit px-4 text-sm">List your class free <ArrowRight size={17} aria-hidden="true" /></span>
			</span>
		</a>
	</section>

	<!-- Teacher tools (phone) -->
	<section class="mx-auto mt-10 max-w-6xl px-4">
		<div class="teach hero-bg overflow-hidden rounded-[28px]">
			<div class="grid items-center gap-10 p-6 sm:grid-cols-[1.1fr_1fr] sm:p-10">
				<div>
					<p class="pill">Free for masters</p>
					<h2 class="mt-3 text-[1.9rem] sm:text-[2.3rem]">Run your class from your phone.</h2>
					<ul class="mt-5 grid gap-2.5 text-white/90">
						<li><strong class="text-white">Attendance in 10 seconds.</strong> Works without internet.</li>
						<li><strong class="text-white">Fees made simple.</strong> Mark paid, send a WhatsApp reminder.</li>
						<li><strong class="text-white">Belts and progress.</strong> Parents see it on their phone.</li>
					</ul>
					<a href="/teach" class="btn btn-primary mt-7">See how it works <ArrowRight size={19} aria-hidden="true" /></a>
				</div>
				<PhoneMock />
			</div>
		</div>
	</section>

	<!-- Trust -->
	<section class="mx-auto mt-10 grid max-w-6xl gap-3 px-4 sm:grid-cols-3">
		<div class="trust panel">
			<span class="t-ico"><Star size={22} aria-hidden="true" /></span>
			<h3>Real reviews only</h3>
			<p>Only students who came to class can review. Masters cannot delete reviews.</p>
		</div>
		<div class="trust panel">
			<span class="t-ico"><ShieldCheck size={22} aria-hidden="true" /></span>
			<h3>Safe for children</h3>
			<p>Parents confirm every child. Children never appear in public search.</p>
		</div>
		<div class="trust panel">
			<span class="t-ico"><WifiOff size={22} aria-hidden="true" /></span>
			<h3>Works on slow internet</h3>
			<p>Light and fast on any phone. Attendance saves even with no signal.</p>
		</div>
	</section>
</main>

<SiteFooter />

<style>
	.hero-title {
		font-size: clamp(2.4rem, 5.6vw, 3.9rem);
		line-height: 1.02;
		letter-spacing: -0.04em;
		color: var(--color-navy);
	}
	@media (prefers-color-scheme: dark) {
		.hero-title {
			color: var(--color-ink);
		}
	}
	.text-brand {
		color: var(--color-brand);
	}
	.hand {
		font-family: var(--font-hand);
		font-weight: 600;
		line-height: 1.05;
	}
	.hero-photo {
		position: relative;
		height: clamp(14rem, 42vw, 22rem);
		border-radius: 28px;
		overflow: hidden;
		box-shadow: var(--shadow-card);
	}
	.note {
		position: absolute;
		right: 1rem;
		bottom: 0.9rem;
		padding: 0.35rem 0.75rem 0.45rem;
		border-radius: 14px;
		background: rgb(255 255 255 / 0.9);
		color: #10294a;
		font-size: 1.35rem;
		transform: rotate(-4deg);
		box-shadow: 0 8px 20px -10px rgb(0 0 0 / 0.4);
	}
	.cats {
		gap: 0.6rem;
	}
	.cat {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		min-height: 52px;
		padding: 0.3rem 1.1rem 0.3rem 0.3rem;
		border-radius: 999px;
		border: 1.5px solid var(--color-line);
		background: var(--color-surface);
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--color-ink);
		white-space: nowrap;
		cursor: pointer;
		transition:
			background-color 160ms ease,
			border-color 160ms ease,
			transform 120ms ease;
	}
	.cat:active {
		transform: scale(0.96);
	}
	.cat[aria-selected='true'] {
		background: var(--color-brand);
		border-color: var(--color-brand);
		color: white;
	}
	.thumb {
		width: 42px;
		height: 42px;
		border-radius: 999px;
		object-fit: cover;
		flex-shrink: 0;
		background: var(--color-indigo-soft);
	}
	.banner {
		position: relative;
		display: block;
		height: clamp(15rem, 48vw, 25rem);
		border-radius: 28px;
		overflow: hidden;
		text-decoration: none;
		box-shadow: var(--shadow-card);
		background: #10294a;
	}
	.banner-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		animation: fade 360ms ease both;
		transition: transform 600ms ease;
	}
	.banner:hover .banner-img {
		transform: scale(1.03);
	}
	@keyframes fade {
		from {
			opacity: 0.2;
		}
	}
	.banner::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, rgb(10 26 48 / 0.82) 0%, rgb(10 26 48 / 0.45) 45%, transparent 75%);
	}
	@media (max-width: 640px) {
		.banner::after {
			background: linear-gradient(0deg, rgb(10 26 48 / 0.88) 0%, rgb(10 26 48 / 0.35) 60%, transparent 100%);
		}
	}
	.banner-text {
		position: absolute;
		z-index: 1;
		left: clamp(1.1rem, 4vw, 2.75rem);
		bottom: clamp(1.1rem, 4vw, 2.5rem);
		right: 1rem;
	}
	.promises {
		display: grid;
		gap: 0.9rem;
		padding: 1rem 1.1rem;
	}
	@media (min-width: 768px) {
		.promises {
			grid-template-columns: repeat(3, 1fr);
		}
		.promises li + li {
			border-left: 1px solid var(--color-line);
			padding-left: 1rem;
		}
	}
	.promises li {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.promises img {
		width: 3.4rem;
		height: 3.4rem;
		border-radius: 999px;
		object-fit: cover;
		flex-shrink: 0;
		border: 3px solid var(--color-indigo-soft);
	}
	.promises span {
		display: grid;
	}
	.promises strong {
		font-size: 1.05rem;
		color: var(--color-indigo-deep);
	}
	.promises small {
		color: var(--color-ink-soft);
		font-size: 0.9rem;
	}
	.who {
		display: flex;
		align-items: stretch;
		min-height: 9.5rem;
		overflow: hidden;
		border-radius: 24px;
		text-decoration: none;
		color: var(--color-ink);
		border: 1px solid var(--color-line);
		box-shadow: var(--shadow-card);
		transition: transform 160ms ease;
	}
	.who:hover {
		transform: translateY(-2px);
	}
	.parents {
		background: linear-gradient(90deg, #fff3e8, #fffaf5);
	}
	.masters {
		background: linear-gradient(90deg, #eaf1fa, #f6f9fd);
	}
	@media (prefers-color-scheme: dark) {
		.parents {
			background: linear-gradient(90deg, #2c1f15, #1a2232);
		}
		.masters {
			background: linear-gradient(90deg, #13294a, #12213a);
		}
	}
	.who :global(.who-img) {
		width: 36%;
		max-width: 13rem;
		flex-shrink: 0;
	}
	.who-text {
		position: relative;
		display: grid;
		align-content: center;
		gap: 0.3rem;
		padding: 1rem 1.2rem;
	}
	.who-text strong {
		font-size: 1.15rem;
		color: var(--color-indigo-deep);
	}
	.who-text small {
		color: var(--color-ink-soft);
		font-size: 0.92rem;
		padding-right: 1.5rem;
	}
	.who-go {
		position: absolute;
		right: 0.9rem;
		top: 50%;
		translate: 0 -50%;
		display: grid;
		place-items: center;
		width: 2.3rem;
		height: 2.3rem;
		border-radius: 999px;
		background: var(--color-surface);
		color: var(--color-brand);
		box-shadow: var(--shadow-card);
	}
	.pill {
		display: inline-block;
		padding: 0.3rem 0.8rem;
		border-radius: 999px;
		background: rgb(242 107 29 / 0.22);
		color: #ffb27a;
		font-weight: 700;
		font-size: 0.85rem;
	}
	.trust {
		display: grid;
		gap: 0.35rem;
		padding: 1.2rem;
	}
	.t-ico {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 999px;
		background: var(--color-indigo-soft);
		color: var(--color-brand);
	}
	.trust h3 {
		font-size: 1.08rem;
	}
	.trust p {
		color: var(--color-ink-soft);
		font-size: 0.93rem;
	}
</style>

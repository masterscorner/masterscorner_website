<script lang="ts">
	import { enhance } from '$app/forms';
	import Clock from '@lucide/svelte/icons/clock';
	import Flag from '@lucide/svelte/icons/flag';
	import Languages from '@lucide/svelte/icons/languages';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Navigation from '@lucide/svelte/icons/navigation';
	import Phone from '@lucide/svelte/icons/phone';
	import Send from '@lucide/svelte/icons/send';
	import Star from '@lucide/svelte/icons/star';
	import LevelStripe from '#lib/components/LevelStripe.svelte';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import Photo from '#lib/components/Photo.svelte';
	import { categoryPhoto } from '#lib/photos.ts';
	import { daysLabel, periodLabel, rupees, shortDate, time12 } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const p = $derived(data.profile);
	const fallback = $derived(categoryPhoto(p.activities[0]?.cat));
	const ages: Record<string, string> = { kids: 'Kids', teens: 'Teens', adults: 'Adults', seniors: 'Seniors' };
	const mapsUrl = $derived(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`);
	const waText = $derived(encodeURIComponent(`Hello, I saw ${p.name} on MastersCorner. I want to know more.`));
	let sending = $state(false);
	const ev = (k: string): string => {
		const e = form?.enquiry;
		return e && 'values' in e ? String(e.values[k] ?? '') : '';
	};
</script>

<svelte:head>
	<title>{p.name}, {p.locality ? `${p.locality}, ` : ''}{p.city} | MastersCorner</title>
	<meta name="description" content="{p.activities.map((a) => a.name).join(', ')} classes in {p.locality ?? p.city}. Timings, fees and reviews." />
</svelte:head>

<SiteHeader signedIn={data.signedIn} />

<div class="mx-auto max-w-5xl md:px-4 md:pt-5">
	<div class="cover">
		{#if p.photos.length}
			<img src="/media/{p.photos[0].storage_key}" alt={p.photos[0].alt_text} class="absolute inset-0 h-full w-full object-cover" />
		{:else}
			<Photo key={fallback} eager sizes="(min-width: 1024px) 1000px, 100vw" class="absolute inset-0 h-full w-full" />
		{/if}
		<div class="absolute inset-x-0 bottom-0"><LevelStripe colors={p.level_colors} height={8} /></div>
	</div>
</div>

<main class="mx-auto max-w-3xl px-4 pb-28">
	<article class="panel relative z-10 -mt-14 grid gap-3 p-5">
		<p class="flex flex-wrap gap-2">
			{#each p.activities as a (a.slug)}
				<a href="/search?activity={a.slug}" class="act">{a.name}</a>
			{/each}
		</p>
		<h1 class="text-[1.9rem] sm:text-[2.3rem]">{p.name}</h1>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.95rem]">
			{#if p.rating_count > 0}
				<span class="flex items-center gap-1.5">
					<span class="rating tnum"><Star size={15} class="fill-current" aria-hidden="true" />{Number(p.rating_avg).toFixed(1)}</span>
					<span class="text-ink-soft">{p.rating_count} {p.rating_count === 1 ? 'review' : 'reviews'}</span>
				</span>
			{:else}
				<span class="text-ink-soft">New on MastersCorner</span>
			{/if}
			<span class="flex items-center gap-1 text-ink-soft"><MapPin size={16} aria-hidden="true" />{p.locality ? `${p.locality}, ` : ''}{p.city}</span>
		</div>
		<div class="facts">
			<div><span class="k">Fees from</span><span class="v tnum">{p.fee_min_paise != null ? rupees(p.fee_min_paise) : 'Ask'}</span></div>
			<div><span class="k">Batches</span><span class="v tnum">{p.batches.length}</span></div>
			<div><span class="k">Teaches in</span><span class="v text-[0.95rem] leading-tight">{p.teaching_languages.slice(0, 2).join(', ') || 'Ask'}</span></div>
		</div>
	</article>

	<div class="actions" role="group" aria-label="Contact this class">
		{#if p.whatsapp_e164}
			<a class="btn btn-whatsapp flex-1" href="https://wa.me/{p.whatsapp_e164.slice(1)}?text={waText}" rel="noopener" target="_blank">
				<MessageCircle size={20} aria-hidden="true" /> WhatsApp
			</a>
		{/if}
		{#if p.phone_e164}
			<a class="btn btn-quiet" href="tel:{p.phone_e164}" aria-label="Call"><Phone size={20} aria-hidden="true" /><span class="hidden sm:inline">Call</span></a>
		{/if}
		<a class="btn btn-primary {p.whatsapp_e164 ? '' : 'flex-1'}" href="#ask"><Send size={20} aria-hidden="true" /> Ask</a>
	</div>

	{#if p.photos.length > 1}
		<section class="mt-6" aria-label="Photos">
			<ul class="rail -mx-4 px-4">
				{#each p.photos as ph (ph.storage_key)}
					<li><img src="/media/{ph.storage_key}" alt={ph.alt_text} loading="lazy" class="h-40 w-60 rounded-2xl object-cover" /></li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="mt-6 grid gap-3" aria-labelledby="where">
		<h2 id="where" class="text-xl">Where</h2>
		<div class="panel flex items-start justify-between gap-3 p-4">
			<p class="flex gap-2">
				<MapPin size={20} class="mt-0.5 shrink-0 text-indigo" aria-hidden="true" />
				<span>
					{p.address_line}{p.locality ? `, ${p.locality}` : ''}<br />
					{p.city}{p.postal_code ? ` ${p.postal_code}` : ''}
					{#if !p.location_precise}<br /><small class="text-ink-soft">Map point is approximate.</small>{/if}
				</span>
			</p>
			<a class="btn btn-quiet shrink-0" href={mapsUrl} rel="noopener" target="_blank"><Navigation size={18} aria-hidden="true" /> Map</a>
		</div>
	</section>

	<section class="mt-6 grid gap-3" aria-labelledby="when">
		<h2 id="when" class="text-xl">Batches and fees</h2>
		<ul class="grid gap-2">
			{#each p.batches as b (b.id)}
				<li class="panel grid gap-1 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
					<div>
						<p class="font-semibold">{b.name}</p>
						<p class="flex items-center gap-1 text-ink-soft"><Clock size={16} aria-hidden="true" /> {daysLabel(b.days)}, {time12(b.start_time)} to {time12(b.end_time)}</p>
					</div>
					{#if b.fee_paise != null}
						<p class="font-semibold">{rupees(b.fee_paise)} <span class="font-normal text-ink-soft">{periodLabel(b.fee_period)}</span></p>
					{/if}
				</li>
			{/each}
		</ul>
		<ul class="flex flex-wrap gap-2 text-sm">
			{#if p.women_only}<li class="tag">Women only</li>{/if}
			{#if p.online}<li class="tag">Online classes too</li>{/if}
			{#each p.age_groups as a (a)}<li class="tag">{ages[a] ?? a}</li>{/each}
		</ul>
		{#if p.teaching_languages.length}
			<p class="flex items-center gap-2"><Languages size={18} aria-hidden="true" /> Teaches in {p.teaching_languages.join(', ')}</p>
		{/if}
	</section>

	{#if p.level_names.length}
		<section class="mt-6" aria-labelledby="levels">
			<h2 id="levels" class="text-xl">Levels</h2>
			<ol class="mt-2 flex flex-wrap gap-2">
				{#each p.level_names as name, i (i)}
					<li class="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm">
						<span class="h-5 w-5 rounded-full border border-black/10" style:background={p.level_colors[i] ?? '#22307a'} aria-hidden="true"></span>{name}
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	{#if p.about}
		<section class="mt-6" aria-labelledby="about">
			<h2 id="about" class="text-xl">About</h2>
			<p class="mt-2 max-w-[65ch] whitespace-pre-line">{p.about}</p>
		</section>
	{/if}

	<section class="mt-8" aria-labelledby="reviews">
		<h2 id="reviews" class="text-xl">Reviews</h2>
		{#if p.reviews.length === 0}
			<p class="mt-2 text-ink-soft">No reviews yet. Students can review after they attend a class.</p>
		{:else}
			<ul class="mt-3 grid gap-3">
				{#each p.reviews as r (r.id)}
					<li class="panel p-4">
						<p class="flex items-center gap-2">
							<span class="flex" aria-label="{r.rating} out of 5">
								{#each [1, 2, 3, 4, 5] as n (n)}
									<Star size={16} class={n <= r.rating ? 'fill-haldi text-haldi' : 'text-line'} aria-hidden="true" />
								{/each}
							</span>
							<strong>{r.author || 'Student'}</strong>
							<span class="text-sm text-ink-soft">{shortDate(r.created_at)}</span>
						</p>
						{#if r.body}<p class="mt-2">{r.body}</p>{/if}
						{#if r.reply}<p class="mt-2 border-l-4 border-indigo-soft pl-3 text-ink-soft"><strong class="text-ink">Teacher replied:</strong> {r.reply}</p>{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section id="ask" class="mt-8" aria-labelledby="ask-title">
		<h2 id="ask-title" class="text-xl">Ask the teacher</h2>
		{#if form?.enquiry && 'sent' in form.enquiry}
			<p class="panel mt-3 p-4 font-semibold text-present" role="status">Sent. The teacher will call or message you.</p>
		{:else}
			<form
				method="POST"
				action="?/enquire"
				class="panel mt-3 grid gap-4 p-4"
				use:enhance={() => {
					sending = true;
					return async ({ update }) => {
						await update({ reset: false });
						sending = false;
					};
				}}
			>
				<label class="field"><span>Your name</span><input class="input" name="name" required maxlength="80" autocomplete="name" defaultValue={ev('name')} /></label>
				<label class="field"><span>Your phone</span><input class="input" name="phone" required inputmode="tel" autocomplete="tel" placeholder="98765 43210" defaultValue={ev('phone')} /></label>
				<label class="field"><span>Question (optional)</span><textarea class="input min-h-24" name="message" maxlength="500" placeholder="For example: Is there a batch for 8 year olds?">{ev('message')}</textarea></label>
				<label class="flex items-center gap-3"><input type="checkbox" name="for_child" class="h-6 w-6" /> This is for my child</label>
				{#if form?.enquiry && 'error' in form.enquiry}<p class="error-text" role="alert">{form.enquiry.error}</p>{/if}
				<p class="text-sm text-ink-soft">Only this class sees your phone number, to reply to you.</p>
				<button class="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send question'}</button>
			</form>
		{/if}
	</section>

	<p class="mt-8 text-sm">
		<a href="/report?type=org&id={p.id}" class="inline-flex items-center gap-1 text-ink-soft"><Flag size={16} aria-hidden="true" /> Report this page</a>
	</p>
</main>

<SiteFooter />

<style>
	.cover {
		position: relative;
		height: clamp(13rem, 42vw, 22rem);
		overflow: hidden;
		background: var(--color-indigo-soft);
	}
	@media (min-width: 768px) {
		.cover {
			border-radius: 28px;
		}
	}
	.act {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		background: var(--color-indigo-soft);
		color: var(--color-indigo);
		font-weight: 800;
		font-size: 0.9rem;
		text-decoration: none;
	}
	.rating {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.15rem 0.55rem;
		border-radius: 8px;
		background: var(--color-present);
		color: white;
		font-weight: 800;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin-top: 0.25rem;
		padding-top: 0.9rem;
		border-top: 1px dashed var(--color-line);
	}
	.facts div {
		display: grid;
	}
	.facts .k {
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}
	.facts .v {
		font-weight: 800;
		font-size: 1.15rem;
	}
	.actions {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 25;
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
		background: color-mix(in oklab, var(--color-surface) 88%, transparent);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-top: 1px solid var(--color-line);
	}
	@media (min-width: 768px) {
		.actions {
			position: static;
			margin-top: 1rem;
			padding: 0;
			background: none;
			backdrop-filter: none;
			border: 0;
		}
	}
	.tag {
		padding: 0.2rem 0.7rem;
		border-radius: 999px;
		background: var(--color-indigo-soft);
		color: var(--color-indigo-deep);
		font-weight: 600;
	}
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import Check from '@lucide/svelte/icons/check';
	import Clock from '@lucide/svelte/icons/clock';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Hourglass from '@lucide/svelte/icons/hourglass';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Star from '@lucide/svelte/icons/star';
	import Video from '@lucide/svelte/icons/video';
	import AttendanceCalendar from '#lib/components/AttendanceCalendar.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import { daysLabel, rupees, shortDate, time12 } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const v = $derived(data.view);
	const marks = $derived(Object.fromEntries(v.attendance.map((a) => [a.on_date, a.status])));
	const classDays = $derived([...new Set(v.batches.flatMap((b) => b.days))]);
	const due = $derived(v.invoices.filter((i) => i.status === 'due'));
	let claiming = $state<string | null>(null);
	let rating = $state(0);
	$effect(() => {
		rating = v.myReview?.rating ?? 0;
	});
</script>

<svelte:head><title>{v.org.name} | My classes</title></svelte:head>

<SiteHeader signedIn />
<main class="mx-auto grid max-w-2xl gap-5 px-4 pt-3 pb-16">
	<div>
		<BackLink href="/app" label="My page" />
		<p class="text-sm font-bold text-ink-soft">{v.person.isMe ? 'My class' : v.person.name}</p>
		<h1 class="text-[1.9rem]">{v.org.name}</h1>
		<div class="mt-2 flex flex-wrap gap-2">
			<a class="btn btn-quiet min-h-10 px-3 text-sm" href="/c/{v.org.slug}"><ExternalLink size={16} aria-hidden="true" /> Class page</a>
			{#if v.org.whatsapp_e164}
				<a class="btn btn-whatsapp min-h-10 px-3 text-sm" href="https://wa.me/{v.org.whatsapp_e164.slice(1)}" target="_blank" rel="noopener"><MessageCircle size={16} aria-hidden="true" /> Teacher</a>
			{/if}
		</div>
	</div>

	{#if form && 'message' in form}<p class="rounded-xl bg-present-soft p-3 font-semibold text-present" role="status">{form.message}</p>{/if}
	{#if form && 'error' in form}<p class="error-text" role="alert">{form.error}</p>{/if}

	<section class="panel grid gap-2 p-5" aria-label="Batches">
		{#each v.batches as b (b.id)}
			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="font-extrabold">{b.name}</p>
					<p class="flex items-center gap-1 text-sm text-ink-soft"><Clock size={15} aria-hidden="true" /> {daysLabel(b.days)}, {time12(b.start_time)} to {time12(b.end_time)}</p>
				</div>
				{#if b.online_url}
					<a class="btn btn-primary min-h-10 px-3 text-sm" href={b.online_url} target="_blank" rel="noopener"><Video size={16} aria-hidden="true" /> Join</a>
				{/if}
			</div>
		{/each}
	</section>

	<section class="panel grid gap-4 p-5" aria-labelledby="fees">
		<h2 id="fees" class="text-lg">Fees</h2>
		{#if due.length === 0}
			<p class="flex items-center gap-2 font-semibold text-present"><Check size={18} aria-hidden="true" /> Nothing to pay now</p>
		{/if}
		{#each due as i (i.id)}
			<div class="grid gap-3 rounded-2xl bg-due-soft p-4">
				<div class="flex items-center justify-between">
					<p class="font-bold">{i.period_label}</p>
					<p class="tnum text-xl font-extrabold">{rupees(i.amount_paise)}</p>
				</div>
				<p class="text-sm text-ink-soft">Due {shortDate(i.due_on)}</p>
				{#if i.claimed}
					<p class="flex items-center gap-2 text-sm font-semibold text-due"><Hourglass size={16} aria-hidden="true" /> You said you paid. Waiting for the teacher to confirm.</p>
				{:else}
					{#if data.payLinks[i.id]}
						<a class="btn btn-primary" href={data.payLinks[i.id]}><Smartphone size={18} aria-hidden="true" /> Pay {rupees(i.amount_paise)} by UPI</a>
						<p class="text-xs text-ink-soft">Opens GPay, PhonePe or Paytm. Money goes straight to the teacher.</p>
					{/if}
					{#if claiming === i.id}
						<form method="POST" action="?/claim" class="grid gap-2" use:enhance>
							<input type="hidden" name="invoice" value={i.id} />
							<label class="field"><span>UPI reference number (optional)</span><input class="input" name="reference" inputmode="numeric" maxlength="40" placeholder="12 numbers from your UPI app" /></label>
							<button class="btn btn-quiet">Send to teacher</button>
						</form>
					{:else}
						<button class="btn btn-quiet" onclick={() => (claiming = i.id)}><Check size={18} aria-hidden="true" /> I have paid</button>
					{/if}
				{/if}
			</div>
		{/each}
		{#if v.invoices.some((i) => i.status === 'paid')}
			<details>
				<summary class="cursor-pointer text-sm font-bold text-ink-soft">Paid before</summary>
				<ul class="mt-2 grid gap-1 text-sm">
					{#each v.invoices.filter((i) => i.status === 'paid') as i (i.id)}
						<li class="flex justify-between"><span>{i.period_label}</span><span class="tnum font-semibold text-present">{rupees(i.amount_paise)} paid</span></li>
					{/each}
				</ul>
			</details>
		{/if}
	</section>

	<section class="panel p-5" aria-label="Attendance">
		<AttendanceCalendar month={data.monthStart} {classDays} {marks} today={data.today} />
	</section>

	{#if v.levels.length}
		<section class="panel grid gap-3 p-5" aria-labelledby="levels">
			<h2 id="levels" class="text-lg">Level</h2>
			<p class="flex items-center gap-3 text-xl font-extrabold">
				<span class="h-7 w-7 rounded-full border border-black/10" style:background={v.levels[0].color ?? '#3b36c9'} aria-hidden="true"></span>{v.levels[0].name}
			</p>
			<ol class="grid gap-1 text-sm text-ink-soft">
				{#each v.levels as l, idx (idx)}
					<li>{l.name}: {shortDate(l.awarded_on)}</li>
				{/each}
			</ol>
		</section>
	{/if}

	{#if v.canReview}
		<section class="panel grid gap-3 p-5" aria-labelledby="rev">
			<h2 id="rev" class="text-lg">{v.myReview ? 'Your review' : 'Review this class'}</h2>
			<form method="POST" action="?/review" class="grid gap-3" use:enhance={() => async ({ update }) => update({ reset: false })}>
				<fieldset class="flex gap-1">
					<legend class="visually-hidden">Stars</legend>
					{#each [1, 2, 3, 4, 5] as n (n)}
						<label class="star" aria-label="{n} {n === 1 ? 'star' : 'stars'}">
							<input type="radio" name="rating" value={n} bind:group={rating} />
							<Star size={34} class={n <= rating ? 'fill-haldi text-haldi' : 'text-line'} aria-hidden="true" />
						</label>
					{/each}
				</fieldset>
				<textarea class="input min-h-24" name="body" maxlength="1000" placeholder="What did you like? (optional)">{v.myReview?.body ?? ''}</textarea>
				<p class="text-xs text-ink-soft">Your first name, stars and words are public. Be honest and kind.</p>
				<button class="btn btn-primary">{v.myReview ? 'Update review' : 'Post review'}</button>
			</form>
		</section>
	{/if}
</main>

<style>
	.star {
		position: relative;
		cursor: pointer;
	}
	.star input {
		position: absolute;
		opacity: 0;
		inset: 0;
	}
	.star:has(input:focus-visible) {
		outline: 3px solid var(--color-haldi);
		border-radius: 8px;
	}
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import Star from '@lucide/svelte/icons/star';
	import BackLink from '#lib/components/BackLink.svelte';
	import { shortDate } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let replying = $state<string | null>(null);
	const avg = $derived(data.reviews.length ? data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length : 0);
</script>

<svelte:head><title>Reviews | {data.org.name}</title></svelte:head>

<BackLink href="/app/c/{data.org.id}/more" />
<h1 class="text-[1.8rem]">Reviews</h1>
<p class="mt-1 text-ink-soft">Only students who came to class can review. You can reply; you cannot delete reviews. Report a review if it is fake or abusive.</p>

{#if form && 'message' in form}<p class="mt-3 rounded-xl bg-present-soft p-3 font-semibold text-present" role="status">{form.message}</p>{/if}

{#if data.reviews.length}
	<div class="panel mt-4 flex items-center gap-4 p-5">
		<p class="tnum text-[2.4rem] font-extrabold">{avg.toFixed(1)}</p>
		<div>
			<span class="flex" aria-label="{avg.toFixed(1)} out of 5">
				{#each [1, 2, 3, 4, 5] as n (n)}<Star size={20} class={n <= Math.round(avg) ? 'fill-haldi text-haldi' : 'text-line'} aria-hidden="true" />{/each}
			</span>
			<p class="text-ink-soft">{data.reviews.length} {data.reviews.length === 1 ? 'review' : 'reviews'}</p>
		</div>
	</div>
	<ul class="mt-4 grid gap-3">
		{#each data.reviews as r (r.id)}
			<li class="panel grid gap-2 p-4">
				<p class="flex items-center gap-2">
					<span class="flex" aria-label="{r.rating} out of 5">{#each [1, 2, 3, 4, 5] as n (n)}<Star size={15} class={n <= r.rating ? 'fill-haldi text-haldi' : 'text-line'} aria-hidden="true" />{/each}</span>
					<strong>{r.author || 'Student'}</strong><span class="text-sm text-ink-soft">{shortDate(r.created_at)}</span>
				</p>
				{#if r.body}<p>{r.body}</p>{/if}
				{#if replying === r.id}
					<form method="POST" action="?/reply" class="grid gap-2" use:enhance={() => async ({ update }) => { await update({ reset: false }); replying = null; }}>
						<input type="hidden" name="id" value={r.id} />
						<textarea class="input min-h-20" name="body" maxlength="1000" placeholder="Thank the student, or answer kindly">{r.reply ?? ''}</textarea>
						<div class="flex gap-2"><button class="btn btn-primary min-h-10 flex-1 text-sm">Save reply</button><button type="button" class="btn btn-quiet min-h-10 text-sm" onclick={() => (replying = null)}>Cancel</button></div>
					</form>
				{:else}
					{#if r.reply}<p class="border-l-4 border-indigo-soft pl-3 text-ink-soft"><strong class="text-ink">Your reply:</strong> {r.reply}</p>{/if}
					<div class="flex gap-4 text-sm font-semibold">
						<button class="text-indigo" onclick={() => (replying = r.id)}>{r.reply ? 'Edit reply' : 'Reply'}</button>
						<a class="text-ink-soft" href="/report?type=review&id={r.id}">Report</a>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<div class="panel mt-5 grid justify-items-center gap-2 p-8 text-center">
		<span class="text-5xl" aria-hidden="true">⭐</span>
		<p class="text-lg font-bold">No reviews yet</p>
		<p class="max-w-[34ch] text-ink-soft">Students can review after they attend. Ask happy students to open MastersCorner and review your class.</p>
	</div>
{/if}

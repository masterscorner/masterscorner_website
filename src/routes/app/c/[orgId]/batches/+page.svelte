<script lang="ts">
	import { enhance } from '$app/forms';
	import Clock from '@lucide/svelte/icons/clock';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Users from '@lucide/svelte/icons/users';
	import Video from '@lucide/svelte/icons/video';
	import BackLink from '#lib/components/BackLink.svelte';
	import BatchForm from '#lib/components/BatchForm.svelte';
	import { daysLabel, periodLabel, rupees, time12 } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let editing = $state<string | null>(null);
	let busy = $state(false);

	const done = () => {
		busy = true;
		return async ({ update, result }: { update: (o?: { reset?: boolean }) => Promise<void>; result: { type: string } }) => {
			await update({ reset: false });
			busy = false;
			if (result.type === 'success') editing = null;
		};
	};
</script>

<svelte:head><title>Batches | {data.org.name}</title></svelte:head>

<BackLink href="/app/c/{data.org.id}/more" />
<div class="flex items-center justify-between gap-3">
	<h1 class="text-[1.8rem]">Batches</h1>
	{#if editing !== 'new'}
		<button class="btn btn-primary min-h-11" onclick={() => (editing = 'new')}><Plus size={18} aria-hidden="true" /> Add batch</button>
	{/if}
</div>

{#if form && 'message' in form}<p class="mt-3 rounded-xl bg-present-soft p-3 font-semibold text-present" role="status">{form.message}</p>{/if}
{#if form && 'error' in form}<p class="error-text mt-3" role="alert">{form.error}</p>{/if}

{#if editing === 'new'}
	<form method="POST" action="?/save" class="panel mt-4 grid gap-4 p-5" use:enhance={done}>
		<h2 class="text-lg">New batch</h2>
		<BatchForm />
		<div class="flex gap-2">
			<button class="btn btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Add batch'}</button>
			<button type="button" class="btn btn-quiet" onclick={() => (editing = null)}>Cancel</button>
		</div>
	</form>
{/if}

<ul class="mt-4 grid gap-3">
	{#each data.batches as b (b.id)}
		<li class="panel grid gap-3 p-4" class:opacity-60={!b.active}>
			{#if editing === b.id}
				<form method="POST" action="?/save" class="grid gap-4" use:enhance={done}>
					<BatchForm batch={b} />
					<div class="flex gap-2">
						<button class="btn btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Save batch'}</button>
						<button type="button" class="btn btn-quiet" onclick={() => (editing = null)}>Cancel</button>
					</div>
				</form>
			{:else}
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="text-lg font-extrabold">{b.name} {#if !b.active}<span class="text-sm font-bold text-ink-soft">(stopped)</span>{/if}</p>
						<p class="flex items-center gap-1 text-ink-soft"><Clock size={16} aria-hidden="true" /> {daysLabel(b.days)}, {time12(b.start_time)} to {time12(b.end_time)}</p>
						<p class="mt-1 flex flex-wrap gap-x-4 text-sm">
							<span class="flex items-center gap-1"><Users size={15} aria-hidden="true" /> {b.students}{b.capacity ? ` of ${b.capacity}` : ''} students</span>
							{#if b.fee_paise != null}<span class="font-bold">{rupees(b.fee_paise)} {periodLabel(b.fee_period)}</span>{/if}
							{#if b.online_url}<span class="flex items-center gap-1 text-indigo"><Video size={15} aria-hidden="true" /> Online link</span>{/if}
						</p>
					</div>
					<button class="btn btn-quiet min-h-10 px-3" onclick={() => (editing = b.id)} aria-label="Edit {b.name}"><Pencil size={16} aria-hidden="true" /></button>
				</div>
				<form method="POST" action="?/active" use:enhance={done}>
					<input type="hidden" name="id" value={b.id} /><input type="hidden" name="on" value={b.active ? '0' : '1'} />
					<button class="text-sm font-semibold text-ink-soft underline">{b.active ? 'Stop this batch' : 'Start this batch again'}</button>
				</form>
			{/if}
		</li>
	{/each}
</ul>

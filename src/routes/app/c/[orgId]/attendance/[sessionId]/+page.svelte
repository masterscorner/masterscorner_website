<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import BackLink from '#lib/components/BackLink.svelte';
	import Check from '@lucide/svelte/icons/check';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import X from '@lucide/svelte/icons/x';
	import { initials, shortDate } from '#lib/format.ts';
	import { queueAttendance } from '#lib/offline-queue.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// One stable id per student for this page view, so a resent save is never counted twice.
	const ids = untrack(() => Object.fromEntries(data.roll.entries.map((e) => [e.person_id, crypto.randomUUID()])));
	let marks = $state<Record<string, string>>(
		untrack(() => Object.fromEntries(data.roll.entries.filter((e) => e.status).map((e) => [e.person_id, e.status as string])))
	);
	let status = $state<'idle' | 'saving' | 'saved' | 'offline' | 'error'>('idle');

	const present = $derived(Object.values(marks).filter((s) => s === 'present' || s === 'late').length);
	const absent = $derived(Object.values(marks).filter((s) => s === 'absent').length);
	const unmarked = $derived(data.roll.entries.length - present - absent);

	function everyonePresent() {
		for (const e of data.roll.entries) if (!marks[e.person_id]) marks[e.person_id] = 'present';
	}
</script>

<svelte:head><title>Attendance | {data.roll.batch_name}</title></svelte:head>

<BackLink href="/app/c/{data.org.id}" />
<p class="text-sm font-bold text-ink-soft">{shortDate(data.roll.on_date)}</p>
<h1 class="text-[1.9rem]">{data.roll.batch_name}</h1>

<div class="mt-3 flex flex-wrap gap-2 text-sm font-semibold" aria-live="polite">
	<span class="pill bg-present-soft text-present"><Check size={16} aria-hidden="true" /> {present} present</span>
	<span class="pill bg-absent-soft text-absent"><X size={16} aria-hidden="true" /> {absent} absent</span>
	{#if unmarked > 0}<span class="pill text-ink-soft">{unmarked} not marked</span>{/if}
</div>

<form
	method="POST"
	action="?/save"
	class="mt-4"
	use:enhance={({ cancel }) => {
		const payload = {
			orgId: data.org.id,
			sessionId: data.roll.session_id,
			marks: Object.entries(marks).map(([personId, s]) => ({ id: ids[personId], personId, status: s })),
			savedAt: Date.now()
		};
		if (!navigator.onLine) {
			cancel();
			queueAttendance(payload).then(() => (status = 'offline'));
			return;
		}
		status = 'saving';
		return async ({ result, update }) => {
			if (result.type === 'error') {
				await queueAttendance(payload);
				status = 'offline';
				return;
			}
			await update({ reset: false, refreshAll: false });
			status = result.type === 'success' ? 'saved' : 'error';
		};
	}}
>
	<button type="button" class="btn btn-quiet mb-3 w-full" onclick={everyonePresent} disabled={unmarked === 0}>
		<CheckCheck size={20} aria-hidden="true" /> Everyone else is present
	</button>
	<noscript><button class="btn btn-quiet mb-3 w-full" name="all_present" value="1">Mark everyone present and save</button></noscript>

	<ul class="grid gap-2">
		{#each data.roll.entries as e (e.person_id)}
			{@const s = marks[e.person_id]}
			<li class="row" data-status={s ?? 'none'}>
				<span class="avatar" aria-hidden="true">{initials(e.display_name)}</span>
				<span class="name">{e.display_name}</span>
				<input type="hidden" name="id:{e.person_id}" value={ids[e.person_id]} />
				<fieldset class="flex gap-1">
					<legend class="visually-hidden">{e.display_name}</legend>
					<label class="seg seg-present" title="Present">
						<input type="radio" name="s:{e.person_id}" value="present" bind:group={marks[e.person_id]} />
						<Check size={22} aria-hidden="true" /><span class="visually-hidden">Present</span>
					</label>
					<label class="seg seg-absent" title="Absent">
						<input type="radio" name="s:{e.person_id}" value="absent" bind:group={marks[e.person_id]} />
						<X size={22} aria-hidden="true" /><span class="visually-hidden">Absent</span>
					</label>
				</fieldset>
			</li>
		{/each}
	</ul>

	<div class="savebar">
		{#if status === 'offline'}
			<p class="flex items-center gap-2 text-sm font-semibold text-due" role="status"><CloudOff size={18} aria-hidden="true" /> No internet. Saved on this phone, will send later.</p>
		{:else if status === 'saved' || (form && 'saved' in form && status === 'idle')}
			<p class="text-sm font-semibold text-present" role="status">Saved.</p>
		{:else if status === 'error' || (form && 'error' in form)}
			<p class="error-text text-sm" role="alert">{form && 'error' in form ? form.error : 'Could not save. Try again.'}</p>
		{/if}
		<button class="btn btn-primary w-full" disabled={status === 'saving'}>
			{status === 'saving' ? 'Saving…' : `Save attendance (${present + absent})`}
		</button>
	</div>
</form>

<style>
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--color-line);
		background: var(--color-surface);
	}
	.row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0.55rem 0.55rem 0.8rem;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
		border-radius: 16px;
		box-shadow: inset 5px 0 0 var(--bar, var(--color-line)), var(--shadow-card);
		transition: border-color 160ms ease, background-color 160ms ease;
	}
	.row[data-status='present'] {
		--bar: var(--color-present);
	}
	.row[data-status='absent'] {
		--bar: var(--color-absent);
		background: var(--color-absent-soft);
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 999px;
		background: var(--color-indigo-soft);
		color: var(--color-indigo-deep);
		font-weight: 700;
	}
	.name {
		font-weight: 600;
		font-size: 1.05rem;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.seg {
		position: relative;
		display: grid;
		place-items: center;
		width: 52px;
		height: 48px;
		border-radius: 12px;
		border: 1.5px solid var(--color-line);
		background: var(--color-surface);
		color: var(--color-ink-soft);
		cursor: pointer;
		transition:
			background-color 160ms ease,
			border-color 160ms ease;
	}
	.seg:has(input:checked) {
		animation: pop 260ms var(--ease-spring);
	}
	@keyframes pop {
		40% {
			transform: scale(1.12);
		}
	}
	.seg input {
		position: absolute;
		opacity: 0;
		inset: 0;
		cursor: pointer;
	}
	.seg:has(input:focus-visible) {
		outline: 3px solid var(--color-haldi);
		outline-offset: 2px;
	}
	.seg-present:has(input:checked) {
		background: var(--color-present);
		border-color: var(--color-present);
		color: white;
	}
	.seg-absent:has(input:checked) {
		background: var(--color-absent);
		border-color: var(--color-absent);
		color: white;
	}
	.savebar {
		position: sticky;
		bottom: calc(4.5rem + env(safe-area-inset-bottom));
		display: grid;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.75rem 0;
		background: linear-gradient(to top, var(--color-chalk) 80%, transparent);
	}
	@media (min-width: 1024px) {
		.savebar {
			bottom: 0;
		}
	}
</style>

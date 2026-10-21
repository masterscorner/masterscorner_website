<script lang="ts">
	import { enhance } from '$app/forms';
	import Award from '@lucide/svelte/icons/award';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import BackLink from '#lib/components/BackLink.svelte';
	import LevelStripe from '#lib/components/LevelStripe.svelte';
	import { shortDate } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const p = $derived(data.page);
	const canManage = $derived(data.org.role !== 'instructor');
	let editing = $state(false);
	let rows = $state<{ name: string; color: string }[]>([]);
	let giving = $state<string | null>(null);
	let openHistory = $state<string | null>(null);

	function startEdit() {
		rows = p.levels.length && p.ownSystem ? p.levels.map((l) => ({ name: l.name, color: l.color ?? '#3b36c9' })) : [
			{ name: 'Beginner', color: '#c9cee6' },
			{ name: 'Intermediate', color: '#7f8bc7' },
			{ name: 'Advanced', color: '#22307a' }
		];
		editing = true;
	}
	const after = () => async ({ update, result }: { update: (o?: { reset?: boolean }) => Promise<void>; result: { type: string } }) => {
		await update({ reset: false });
		if (result.type === 'success') {
			editing = false;
			giving = null;
		}
	};
	const nextLevel = (levelId: number | null) => {
		const i = p.levels.findIndex((l) => l.id === levelId);
		return p.levels[Math.min(i + 1, p.levels.length - 1)]?.id ?? p.levels[0]?.id;
	};
</script>

<svelte:head><title>Levels | {data.org.name}</title></svelte:head>

<BackLink href="/app/c/{data.org.id}/more" label="More" />
<h1 class="text-[1.8rem]">Levels</h1>
<p class="mt-1 text-ink-soft">Belts, grades or levels. Give a student their next level after a grading. Students and parents see it.</p>

{#if form && 'message' in form}<p class="mt-3 rounded-xl bg-present-soft p-3 font-semibold text-present" role="status">{form.message}</p>{/if}
{#if form && 'error' in form}<p class="error-text mt-3" role="alert">{form.error}</p>{/if}

<section class="panel mt-4 grid gap-3 overflow-hidden" aria-label="Level list">
	{#if p.levels.length}
		<LevelStripe colors={p.levels.map((l) => l.color ?? '#3b36c9')} height={10} />
		<div class="grid gap-3 px-5 pb-5">
			<p class="font-extrabold">{p.systemName}</p>
			<ol class="flex flex-wrap gap-2">
				{#each p.levels as l (l.id)}
					<li class="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm font-semibold">
						<span class="h-5 w-5 rounded-full border border-black/10" style:background={l.color ?? '#3b36c9'} aria-hidden="true"></span>{l.name}
					</li>
				{/each}
			</ol>
		</div>
	{:else}
		<p class="p-5 text-ink-soft">No level list yet. Choose one below.</p>
	{/if}
</section>

{#if canManage}
	{#if editing}
		<form method="POST" action="?/own" class="panel mt-4 grid gap-3 p-5" use:enhance={after}>
			<h2 class="text-lg">My own level list</h2>
			<label class="field"><span>List name</span><input class="input" name="name" maxlength="60" defaultValue={p.ownSystem ? (p.systemName ?? '') : 'Our levels'} /></label>
			<ol class="grid gap-2">
				{#each rows as r, i (i)}
					<li class="flex items-center gap-2">
						<span class="w-6 text-right text-sm font-bold text-ink-soft">{i + 1}</span>
						<input type="color" name="color" bind:value={r.color} class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1" aria-label="Colour of level {i + 1}" />
						<input class="input min-h-11" name="level" bind:value={r.name} maxlength="40" aria-label="Name of level {i + 1}" />
						<button type="button" class="btn btn-quiet min-h-11 px-2" aria-label="Remove level {i + 1}" onclick={() => (rows = rows.filter((_, j) => j !== i))}><Trash2 size={16} aria-hidden="true" /></button>
					</li>
				{/each}
			</ol>
			<button type="button" class="btn btn-quiet w-fit min-h-10 text-sm" onclick={() => (rows = [...rows, { name: '', color: '#3b36c9' }])}><Plus size={16} aria-hidden="true" /> Add level</button>
			<div class="flex gap-2"><button class="btn btn-primary flex-1">Save list</button><button type="button" class="btn btn-quiet" onclick={() => (editing = false)}>Cancel</button></div>
		</form>
	{:else}
		<details class="panel mt-4 p-5">
			<summary class="cursor-pointer font-bold">Change the level list</summary>
			<div class="mt-4 grid gap-3">
				{#each p.templates as t (t.id)}
					<div class="flex items-center gap-3 rounded-xl border border-line p-3">
						<div class="min-w-0 flex-1">
							<p class="font-bold">{t.name}</p>
							<div class="mt-1 w-40 overflow-hidden rounded"><LevelStripe colors={t.levels.map((l) => l.color ?? '#3b36c9')} height={6} /></div>
						</div>
						<form method="POST" action="?/template" use:enhance={after}>
							<input type="hidden" name="template" value={t.id} />
							<button class="btn btn-quiet min-h-9 px-3 text-sm" disabled={p.systemId === t.id}>{p.systemId === t.id ? 'In use' : 'Use'}</button>
						</form>
					</div>
				{/each}
				<button class="btn btn-quiet" onclick={startEdit}>{p.ownSystem ? 'Edit my own list' : 'Make my own list'}</button>
			</div>
		</details>
	{/if}
{/if}

{#if p.levels.length}
	<h2 class="mt-8 text-lg">Students</h2>
	{#if p.students.length === 0}<p class="mt-2 text-ink-soft">No students yet.</p>{/if}
	<ul class="mt-3 grid gap-2">
		{#each p.students as s (s.person_id)}
			<li class="panel grid gap-3 p-4">
				<div class="flex items-center gap-3">
					<span class="h-9 w-9 shrink-0 rounded-full border border-black/10" style:background={s.level_color ?? 'var(--color-line)'} aria-hidden="true"></span>
					<div class="min-w-0 flex-1">
						<p class="truncate font-bold">{s.display_name}</p>
						<p class="text-sm text-ink-soft">
							{s.level_name ? `${s.level_name} since ${shortDate(s.awarded_on!)}` : 'No level yet'} ·
							<span class="font-semibold text-ink">{s.classes_since} {s.classes_since === 1 ? 'class' : 'classes'}{s.level_name ? ' since' : ' so far'}</span>
						</p>
					</div>
					{#if giving !== s.person_id}
						<button class="btn btn-quiet min-h-10 px-3 text-sm" onclick={() => (giving = s.person_id)}><Award size={16} aria-hidden="true" /> Give level</button>
					{/if}
				</div>
				{#if giving === s.person_id}
					<form method="POST" action="?/award" class="grid gap-2 border-t border-dashed border-line pt-3" use:enhance={after}>
						<input type="hidden" name="person" value={s.person_id} />
						<div class="grid grid-cols-[1fr_auto] gap-2">
							<select class="input min-h-11" name="level" aria-label="Level">
								{#each p.levels as l (l.id)}<option value={l.id} selected={l.id === nextLevel(s.level_id)}>{l.name}</option>{/each}
							</select>
							<input class="input min-h-11 w-auto" type="date" name="on" max={data.today} defaultValue={data.today} aria-label="Date" />
						</div>
						<input class="input min-h-11" name="note" maxlength="300" placeholder="Note (optional), e.g. grading by Sensei Kumar" />
						<div class="flex gap-2"><button class="btn btn-primary min-h-11 flex-1">Save</button><button type="button" class="btn btn-quiet min-h-11" onclick={() => (giving = null)}>Cancel</button></div>
					</form>
				{/if}
				{#if s.history.length}
					<button class="w-fit text-sm font-semibold text-ink-soft" onclick={() => (openHistory = openHistory === s.person_id ? null : s.person_id)}>{openHistory === s.person_id ? 'Hide history' : 'History'}</button>
					{#if openHistory === s.person_id}
						<ul class="grid gap-1 text-sm">
							{#each s.history as h (h.id)}
								<li class="flex items-center justify-between gap-2" class:line-through={h.revoked} class:opacity-60={h.revoked}>
									<span>{h.level_name}, {shortDate(h.awarded_on)}</span>
									{#if canManage && !h.revoked}
										<form method="POST" action="?/revoke" use:enhance={after}><input type="hidden" name="id" value={h.id} /><button class="text-xs font-semibold text-absent">This was a mistake</button></form>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</li>
		{/each}
	</ul>
{/if}

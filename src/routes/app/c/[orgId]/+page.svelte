<script lang="ts">
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import ProgressRing from '#lib/components/ProgressRing.svelte';
	import { shortDate, time12 } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const base = $derived(`/app/c/${data.org.id}`);
	const totals = $derived(
		data.batches.reduce((t, b) => ({ students: t.students + b.students, present: t.present + b.present, marked: t.marked + b.marked }), {
			students: 0,
			present: 0,
			marked: 0
		})
	);
</script>

<svelte:head><title>Today | {data.org.name}</title></svelte:head>

{#if data.justCreated}
	<div class="welcome hero-bg mb-6 grid gap-3 rounded-[22px] p-5">
		<p class="flex items-center gap-2 text-lg font-extrabold"><PartyPopper size={24} class="text-haldi" aria-hidden="true" /> Your class is live.</p>
		<p class="text-white/80">Next: add your students, then take attendance.</p>
		<div class="flex flex-wrap gap-2">
			<a class="btn btn-haldi" href="{base}/students"><UserPlus size={20} aria-hidden="true" /> Add students</a>
			<a class="btn border-white/30 bg-white/10 text-white" href="/c/{data.org.slug}" target="_blank"><ExternalLink size={18} aria-hidden="true" /> My public page</a>
		</div>
	</div>
{/if}

<div class="flex items-end justify-between gap-3">
	<div>
		<p class="text-sm font-bold text-ink-soft">{shortDate(data.day)}</p>
		<h1 class="text-[1.9rem]">{data.isToday ? 'Today' : 'Yesterday'}</h1>
	</div>
	<nav class="seg" aria-label="Choose day">
		<a href="?day=yesterday" aria-current={!data.isToday ? 'page' : undefined}>Yesterday</a>
		<a href={base} aria-current={data.isToday ? 'page' : undefined}>Today</a>
	</nav>
</div>

{#if data.batches.length > 0}
	<div class="mt-4 grid grid-cols-3 gap-2">
		<div class="stat"><span class="tnum">{data.batches.length}</span><small>{data.batches.length === 1 ? 'batch' : 'batches'}</small></div>
		<div class="stat"><span class="tnum">{totals.students}</span><small>students</small></div>
		<div class="stat good"><span class="tnum">{totals.present}</span><small>present</small></div>
	</div>
{/if}

{#if data.batches.length === 0}
	<div class="panel mt-5 grid justify-items-center gap-2 p-8 text-center">
		<span class="text-5xl" aria-hidden="true">🌤️</span>
		<p class="text-lg font-bold">No batch {data.isToday ? 'today' : 'yesterday'}</p>
		<p class="text-ink-soft">Batches show here on the days they run.</p>
	</div>
{:else}
	<ul class="mt-5 grid gap-3">
		{#each data.batches as b (b.batch_id)}
			{@const done = b.marked > 0 && b.marked >= b.students}
			<li class="panel grid gap-4 p-4">
				<div class="flex items-center gap-4">
					<ProgressRing value={b.present} total={b.students} />
					<div class="min-w-0 flex-1">
						<p class="truncate text-lg font-extrabold">{b.batch_name}</p>
						<p class="flex items-center gap-1 text-ink-soft"><Clock size={16} aria-hidden="true" /> {time12(b.start_time)} to {time12(b.end_time)}</p>
						{#if done}
							<p class="mt-1 inline-flex items-center gap-1 rounded-full bg-present-soft px-2.5 py-0.5 text-sm font-bold text-present"><CircleCheck size={15} aria-hidden="true" /> Attendance done</p>
						{:else if b.students > 0}
							<p class="mt-1 inline-flex items-center rounded-full bg-due-soft px-2.5 py-0.5 text-sm font-bold text-due">Not taken yet</p>
						{/if}
					</div>
				</div>
				{#if b.students > 0}
					<a class="btn {done ? 'btn-quiet' : 'btn-primary'}" href="{base}/attendance/{b.session_id}">
						<CalendarCheck size={20} aria-hidden="true" /> {done ? 'Change attendance' : 'Take attendance'}
					</a>
				{:else}
					<a class="btn btn-quiet" href="{base}/students"><UserPlus size={20} aria-hidden="true" /> Add students to this batch</a>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.seg {
		display: flex;
		padding: 0.25rem;
		border-radius: 999px;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
	}
	.seg a {
		padding: 0.4rem 0.85rem;
		border-radius: 999px;
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--color-ink-soft);
		text-decoration: none;
	}
	.seg a[aria-current='page'] {
		background: var(--color-indigo-soft);
		color: var(--color-indigo-deep);
	}
	.stat {
		display: grid;
		padding: 0.75rem 0.9rem;
		border-radius: 16px;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
	}
	.stat span {
		font-size: 1.5rem;
		font-weight: 800;
		line-height: 1.1;
	}
	.stat small {
		color: var(--color-ink-soft);
		font-weight: 600;
	}
	.stat.good span {
		color: var(--color-present);
	}
</style>

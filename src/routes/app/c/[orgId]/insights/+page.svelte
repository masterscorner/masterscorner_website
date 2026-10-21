<script lang="ts">
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Award from '@lucide/svelte/icons/award';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import ChartCard from '#lib/components/charts/ChartCard.svelte';
	import Columns from '#lib/components/charts/Columns.svelte';
	import Legend from '#lib/components/charts/Legend.svelte';
	import LineChart from '#lib/components/charts/LineChart.svelte';
	import { compact } from '#lib/components/charts/bar-path.ts';
	import { READY_AFTER } from '#lib/insights-shared.ts';
	import { rupees, shortDate } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const d = $derived(data.insights);
	const base = $derived(`/app/c/${data.org.id}`);
	const pct = (came: number, marked: number) => (marked ? Math.round((came / marked) * 100) : null);
	const month = (iso: string) => new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(`${iso}T00:00:00`));

	const sum = (rows: { came: number; marked: number }[]) => rows.reduce((t, r) => ({ came: t.came + r.came, marked: t.marked + r.marked }), { came: 0, marked: 0 });
	const recent = $derived(sum(d.weeks.slice(-4)));
	const before = $derived(sum(d.weeks.slice(-8, -4)));
	const nowPct = $derived(pct(recent.came, recent.marked));
	const beforePct = $derived(pct(before.came, before.marked));
	const delta = $derived(nowPct != null && beforePct != null ? nowPct - beforePct : null);
	const thisMonthFees = $derived(d.fees?.at(-1));

	const weekPoints = $derived(
		d.weeks.map((w) => ({
			label: shortDate(w.week),
			value: pct(w.came, w.marked),
			tip: w.marked ? `Week of ${shortDate(w.week)}: ${w.came} of ${w.marked} came` : `Week of ${shortDate(w.week)}`
		}))
	);
	const batchRows = $derived(
		d.batches
			.map((b) => ({ ...b, pct: pct(b.came, b.marked) }))
			.sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101))
	);
	const mixTotal = $derived(d.students.children + d.students.adults);
	const hasMonths = $derived(d.months.some((m) => m.joined || m.left));
	const hasFees = $derived(!!d.fees?.some((f) => f.due));
</script>

<svelte:head><title>Insights | {data.org.name}</title></svelte:head>

<h1 class="text-[1.6rem]">Insights</h1>
<p class="mt-1 text-ink-soft">How your class is doing. Numbers update every time you mark attendance or fees.</p>

<div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
	<a class="tile" href="{base}/students">
		<span class="label">Students</span>
		<span class="value">{d.students.active}</span>
		<span class="meta">{d.students.trial ? `+${d.students.trial} new` : d.students.paused ? `${d.students.paused} paused` : 'active now'}</span>
	</a>
	<div class="tile">
		<span class="label">Attendance, last 4 weeks</span>
		<span class="value">{nowPct == null ? '–' : `${nowPct}%`}</span>
		{#if delta != null}
			<span class="meta flex items-center gap-1" class:up={delta > 0} class:down={delta < 0}>
				{#if delta > 0}<TrendingUp size={15} aria-hidden="true" />{:else if delta < 0}<TrendingDown size={15} aria-hidden="true" />{/if}
				{delta === 0 ? 'Same as' : `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)} points from`} the 4 weeks before
			</span>
		{:else}
			<span class="meta">{recent.marked ? `${recent.came} of ${recent.marked} came` : 'Mark attendance to see this'}</span>
		{/if}
	</div>
	{#if thisMonthFees}
		<a class="tile" href="{base}/fees">
			<span class="label">Fees this month</span>
			<span class="value">{rupees(thisMonthFees.collected)}</span>
			<span class="meta">{thisMonthFees.due ? `of ${rupees(thisMonthFees.due)} due` : 'No fees set'}</span>
		</a>
	{/if}
	{#if data.org.role !== 'instructor'}
	<a class="tile" href="{base}/enquiries">
		<span class="label">New enquiries</span>
		<span class="value">{d.enquiriesNew}</span>
		<span class="meta">{d.enquiriesNew ? 'waiting for your call' : 'all answered'}</span>
	</a>
	{/if}
</div>

{#if d.atRisk.length}
	<section class="panel mt-4 grid gap-2 border-due/40 p-4" aria-label="Students who missed classes">
		<h2 class="flex items-center gap-2 text-[1.05rem]"><AlertTriangle size={18} class="text-due" aria-hidden="true" /> Missed the last 3 classes</h2>
		<p class="text-sm text-ink-soft">A quick call or message often brings them back.</p>
		<ul class="grid gap-1">
			{#each d.atRisk as s (s.person_id)}
				<li class="flex justify-between gap-2 border-t border-line pt-2"><strong class="truncate">{s.display_name}</strong><span class="shrink-0 text-sm text-ink-soft">{s.last_came ? `Last came ${shortDate(s.last_came)}` : 'Has not come yet'}</span></li>
			{/each}
		</ul>
	</section>
{/if}

<div class="mt-4 grid gap-4">
	<ChartCard title="Attendance each week" sub="Share of students who came, last 12 weeks">
		{#if weekPoints.some((p) => p.value != null)}
			<LineChart points={weekPoints} name="Attendance each week, last 12 weeks" />
		{:else}
			<p class="empty">Mark attendance for a few classes and the line appears here.</p>
		{/if}
		{#snippet table()}
			<table>
				<thead><tr><th>Week of</th><th>Came</th><th>Marked</th><th>%</th></tr></thead>
				<tbody>{#each d.weeks as w (w.week)}<tr><td>{shortDate(w.week)}</td><td>{w.came}</td><td>{w.marked}</td><td>{pct(w.came, w.marked) ?? '–'}</td></tr>{/each}</tbody>
			</table>
		{/snippet}
	</ChartCard>

	{#if batchRows.length > 1 || (batchRows.length === 1 && batchRows[0].marked)}
		<ChartCard title="Attendance by batch" sub="Last 4 weeks, lowest first">
			<ul class="grid gap-3">
				{#each batchRows as b (b.name)}
					<li class="grid gap-1" title="{b.came} of {b.marked} came">
						<span class="text-sm font-semibold">{b.name}</span>
						<span class="flex items-center gap-2">
							<span class="h-3 flex-1 overflow-hidden rounded-r bg-chalk">
								<span class="block h-full rounded-r bg-chart-1" style:width="{b.pct ?? 0}%"></span>
							</span>
							<span class="tnum w-11 text-right text-sm font-bold">{b.pct == null ? '–' : `${b.pct}%`}</span>
						</span>
					</li>
				{/each}
			</ul>
			{#snippet table()}
				<table>
					<thead><tr><th>Batch</th><th>Came</th><th>Marked</th><th>%</th></tr></thead>
					<tbody>{#each batchRows as b (b.name)}<tr><td>{b.name}</td><td>{b.came}</td><td>{b.marked}</td><td>{b.pct ?? '–'}</td></tr>{/each}</tbody>
				</table>
			{/snippet}
		</ChartCard>
	{/if}

	{#if d.fees}
		<ChartCard title="Fees collected" sub="Paid against what was due, last 6 months">
			{#if hasFees}
				<Legend items={[{ label: 'Collected', swatch: 'var(--color-chart-1)' }, { label: 'Due', swatch: 'var(--color-chart-track)' }]} />
				<Columns
					mode="meter"
					name="Fees collected against due, last 6 months"
					format={(n) => `₹${compact(n / 100)}`}
					cols={d.fees.map((f) => ({ label: month(f.month), a: f.collected, b: f.due, tip: [`Collected ${rupees(f.collected)}`, `Due ${rupees(f.due)}`] }))}
				/>
			{:else}
				<p class="empty">Set a monthly fee for a batch and open the Fees tab to start.</p>
			{/if}
			{#snippet table()}
				<table>
					<thead><tr><th>Month</th><th>Collected</th><th>Due</th></tr></thead>
					<tbody>{#each d.fees ?? [] as f (f.month)}<tr><td>{month(f.month)}</td><td>{rupees(f.collected)}</td><td>{rupees(f.due)}</td></tr>{/each}</tbody>
				</table>
			{/snippet}
		</ChartCard>
	{/if}

	<ChartCard title="Joined and left" sub="Students each month, last 6 months">
		{#if hasMonths}
			<Legend items={[{ label: 'Joined', swatch: 'var(--color-chart-1)' }, { label: 'Left', swatch: 'var(--color-chart-2)' }]} />
			<Columns
				mode="mirror"
				name="Students who joined and left each month"
				cols={d.months.map((m) => ({ label: month(m.month), a: m.joined, b: m.left, tip: [`Joined ${m.joined}`, `Left ${m.left}`] }))}
			/>
		{:else}
			<p class="empty">Nobody has joined or left in the last 6 months.</p>
		{/if}
		{#snippet table()}
			<table>
				<thead><tr><th>Month</th><th>Joined</th><th>Left</th></tr></thead>
				<tbody>{#each d.months as m (m.month)}<tr><td>{month(m.month)}</td><td>{m.joined}</td><td>{m.left}</td></tr>{/each}</tbody>
			</table>
		{/snippet}
	</ChartCard>

	{#if mixTotal}
		<ChartCard title="Who comes" sub="{mixTotal} students now">
			<div class="flex h-3 gap-0.5" role="img" aria-label="{d.students.children} children and {d.students.adults} adults">
				{#if d.students.children}<span class="h-full rounded-l bg-chart-1" class:rounded-r={!d.students.adults} style:flex-grow={d.students.children}></span>{/if}
				{#if d.students.adults}<span class="h-full rounded-r bg-chart-2" class:rounded-l={!d.students.children} style:flex-grow={d.students.adults}></span>{/if}
			</div>
			<Legend
				items={[
					{ label: `Children under 18: ${d.students.children} (${Math.round((d.students.children / mixTotal) * 100)}%)`, swatch: 'var(--color-chart-1)' },
					{ label: `Adults: ${d.students.adults} (${Math.round((d.students.adults / mixTotal) * 100)}%)`, swatch: 'var(--color-chart-2)' }
				]}
			/>
		</ChartCard>
	{/if}

	{#if d.hasLevels}
		<section class="panel grid gap-2 p-4 sm:p-5" aria-label="Ready for a grading">
			<h2 class="flex items-center gap-2 text-[1.05rem]"><Award size={18} class="text-indigo" aria-hidden="true" /> Ready for a grading?</h2>
			<p class="text-sm text-ink-soft">Students with {READY_AFTER} or more classes since their last level.</p>
			{#if d.ready.length}
				<ul class="grid gap-1">
					{#each d.ready as s (s.person_id)}
						<li class="flex justify-between gap-2 border-t border-line pt-2"><strong class="truncate">{s.display_name}</strong><span class="shrink-0 text-sm text-ink-soft">{s.level_name ?? 'No level'}, {s.classes_since} classes</span></li>
					{/each}
				</ul>
			{:else}
				<p class="empty">Nobody yet.</p>
			{/if}
			<a class="btn btn-quiet mt-1 w-fit min-h-10 text-sm" href="{base}/levels">Open levels</a>
		</section>
	{/if}
</div>

<style>
	.tile {
		display: grid;
		align-content: start;
		gap: 0.15rem;
		padding: 0.9rem 1rem;
		border-radius: var(--radius-card);
		background: var(--color-surface);
		border: 1px solid var(--color-line);
		box-shadow: var(--shadow-card);
		color: inherit;
		text-decoration: none;
	}
	a.tile:hover {
		border-color: var(--color-indigo);
	}
	.label {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--color-ink-soft);
	}
	.value {
		font-size: 1.9rem;
		font-weight: 800;
		line-height: 1.15;
		color: var(--color-ink);
	}
	.meta {
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}
	.meta.up {
		color: var(--color-present);
	}
	.meta.down {
		color: var(--color-absent);
	}
	.empty {
		padding: 1.25rem 0;
		text-align: center;
		color: var(--color-ink-soft);
	}
</style>

<script lang="ts">
	// One month of class days: green = present, red = absent, grey ring = class day not marked.
	let { month, classDays, marks, today }: { month: string; classDays: number[]; marks: Record<string, string>; today: string } = $props();

	const cells = $derived.by(() => {
		const [y, m] = month.split('-').map(Number);
		const first = new Date(Date.UTC(y, m - 1, 1));
		const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
		const lead = (first.getUTCDay() + 6) % 7; // Monday first
		const out: { date: string | null; day: number; kind: string }[] = [];
		for (let i = 0; i < lead; i++) out.push({ date: null, day: 0, kind: 'blank' });
		for (let d = 1; d <= days; d++) {
			const date = `${month.slice(0, 8)}${String(d).padStart(2, '0')}`;
			const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
			const mark = marks[date];
			const kind = mark === 'present' || mark === 'late' ? 'present' : mark === 'absent' ? 'absent' : classDays.includes(dow) && date <= today ? 'missed' : classDays.includes(dow) ? 'future' : 'none';
			out.push({ date, day: d, kind });
		}
		return out;
	});
	const label = $derived(new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}T00:00:00Z`)));
	const present = $derived(cells.filter((c) => c.kind === 'present').length);
	const absent = $derived(cells.filter((c) => c.kind === 'absent').length);
</script>

<div class="cal">
	<div class="flex items-baseline justify-between">
		<p class="font-extrabold">{label}</p>
		<p class="text-sm"><span class="font-bold text-present">{present} present</span> <span class="text-ink-soft">/</span> <span class="font-bold text-absent">{absent} absent</span></p>
	</div>
	<div class="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-ink-soft" aria-hidden="true">
		{#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as d, i (i)}<span>{d}</span>{/each}
	</div>
	<ol class="grid grid-cols-7 gap-1.5">
		{#each cells as c, i (i)}
			<li class="cell {c.kind}" aria-label={c.date ? `${c.day}: ${c.kind === 'present' ? 'present' : c.kind === 'absent' ? 'absent' : c.kind === 'missed' ? 'class, not marked' : c.kind === 'future' ? 'class day' : 'no class'}` : undefined}>
				{c.day || ''}
			</li>
		{/each}
	</ol>
</div>

<style>
	.cal {
		display: grid;
		gap: 0.6rem;
	}
	.cell {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		border-radius: 999px;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--color-ink-soft);
	}
	.cell.present {
		background: var(--color-present);
		color: white;
	}
	.cell.absent {
		background: var(--color-absent);
		color: white;
	}
	.cell.missed,
	.cell.future {
		box-shadow: inset 0 0 0 1.5px var(--color-line);
		color: var(--color-ink);
	}
	.cell.blank {
		visibility: hidden;
	}
</style>

<script lang="ts">
	// Monthly columns. "meter": a filled column (a) inside a lighter track (b = the total).
	// "mirror": a grows up from the baseline, b grows down (e.g. joined vs left).
	import { barPath, compact, niceMax } from './bar-path.ts';

	export interface Col {
		label: string;
		a: number;
		b: number;
		tip: string[]; // tooltip lines
	}
	let { cols, mode, name, format = compact }: { cols: Col[]; mode: 'meter' | 'mirror'; name: string; format?: (n: number) => string } = $props();

	let width = $state(320);
	const top = 16;
	const left = 36;
	const axis = 22;
	const H = 140;
	const plotW = $derived(Math.max(60, width - left - 4));
	const band = $derived(plotW / Math.max(1, cols.length));
	const barW = $derived(Math.min(24, band * 0.55));
	const cx = (i: number) => left + band * i + band / 2;

	const upMax = $derived(niceMax(Math.max(1, ...cols.map((c) => (mode === 'meter' ? Math.max(c.a, c.b) : c.a)))));
	const downMax = $derived(mode === 'mirror' ? niceMax(Math.max(1, ...cols.map((c) => c.b))) : 0);
	// One scale for both directions: the plot height is shared in proportion.
	const unit = $derived(H / (upMax + downMax));
	const base = $derived(top + upMax * unit);
	const plotBottom = $derived(base + downMax * unit);
	const ticks = $derived(mode === 'mirror' ? [upMax, 0, -downMax] : [0, upMax / 2, upMax]);

	let hover = $state<number | null>(null);
	const tipLeft = $derived(hover == null ? 0 : cx(hover) + barW / 2 + 158 <= width ? cx(hover) + barW / 2 + 8 : Math.max(0, cx(hover) - barW / 2 - 158));
</script>

<div class="relative" bind:clientWidth={width}>
	<svg width={width} height={plotBottom + axis} role="img" aria-label={name}>
		{#each ticks as t (t)}
			<line x1={left} x2={left + plotW} y1={base - t * unit} y2={base - t * unit} class="grid" />
			<text x={left - 6} y={base - t * unit} dy="0.32em" text-anchor="end" class="tick">{format(Math.abs(t))}</text>
		{/each}
		{#each cols as c, i (i)}
			{@const x0 = cx(i) - barW / 2}
			{#if mode === 'meter'}
				<path d={barPath(x0, base - c.b * unit, barW, c.b * unit)} class="track" />
				<path d={barPath(x0, base - c.a * unit, barW, c.a * unit)} class="s1" />
			{:else}
				<path d={barPath(x0, base - c.a * unit - 1, barW, c.a * unit)} class="s1" />
				<path d={barPath(x0, base + 1, barW, c.b * unit, 'bottom')} class="s2" />
			{/if}
			<text x={cx(i)} y={plotBottom + 16} text-anchor="middle" class="tick">{c.label}</text>
			<rect
				x={left + band * i}
				y={top}
				width={band}
				height={plotBottom - top}
				fill="transparent"
				role="presentation"
				onpointerenter={() => (hover = i)}
				onpointerleave={() => (hover = null)}
			/>
		{/each}
		<line x1={left} x2={left + plotW} y1={base} y2={base} class="axis" />
	</svg>
	{#if hover != null}
		<div class="tip" style:left="{tipLeft}px" role="status">
			<strong>{cols[hover].label}</strong>
			{#each cols[hover].tip as line (line)}<span>{line}</span>{/each}
		</div>
	{/if}
</div>

<style>
	svg {
		display: block;
		overflow: visible;
	}
	.grid {
		stroke: var(--color-chart-grid);
	}
	.axis {
		stroke: var(--color-line);
	}
	.tick {
		fill: var(--color-ink-soft);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.track {
		fill: var(--color-chart-track);
	}
	.s1 {
		fill: var(--color-chart-1);
	}
	.s2 {
		fill: var(--color-chart-2);
	}
	.tip {
		position: absolute;
		top: 0;
		width: 150px;
		display: grid;
		padding: 0.4rem 0.6rem;
		border-radius: 10px;
		background: var(--color-raised);
		border: 1px solid var(--color-line);
		box-shadow: var(--shadow-card);
		font-size: 0.8rem;
		color: var(--color-ink-soft);
		pointer-events: none;
	}
	.tip strong {
		color: var(--color-ink);
	}
</style>

<script lang="ts">
	// One series over time (0–100%). Crosshair + tooltip on hover/keyboard; the end value is labelled.
	export interface Point {
		label: string; // x-axis label
		value: number | null; // null = no classes that week
		tip: string; // tooltip line under the value
	}
	let { points, unit = '%', max = 100, name }: { points: Point[]; unit?: string; max?: number; name: string } = $props();

	let width = $state(320);
	const H = 150;
	const top = 12;
	const left = 34;
	const right = 40;
	const axis = 24;
	const plotW = $derived(Math.max(60, width - left - right));
	const x = (i: number) => left + (points.length <= 1 ? plotW / 2 : (i * plotW) / (points.length - 1));
	const y = (v: number) => top + H - (v / max) * H;
	const ticks = $derived([0, max / 2, max]);

	const segments = $derived.by(() => {
		const out: { x: number; y: number }[][] = [];
		let cur: { x: number; y: number }[] = [];
		points.forEach((p, i) => {
			if (p.value == null) {
				if (cur.length) out.push(cur);
				cur = [];
			} else cur.push({ x: x(i), y: y(p.value) });
		});
		if (cur.length) out.push(cur);
		return out;
	});
	const line = (seg: { x: number; y: number }[]) => seg.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('');
	const area = (seg: { x: number; y: number }[]) => `${line(seg)}L${seg.at(-1)!.x},${top + H}L${seg[0].x},${top + H}Z`;
	const lastIdx = $derived(points.findLastIndex((p) => p.value != null));
	const every = $derived(Math.ceil(points.length / Math.max(2, Math.floor(plotW / 56))));

	let hover = $state<number | null>(null);
	function move(e: PointerEvent) {
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const px = e.clientX - box.left;
		const i = Math.round(((px - left) / plotW) * (points.length - 1));
		hover = Math.max(0, Math.min(points.length - 1, i));
	}
	function key(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			const d = e.key === 'ArrowRight' ? 1 : -1;
			hover = Math.max(0, Math.min(points.length - 1, (hover ?? lastIdx) + d));
		} else if (e.key === 'Escape') hover = null;
	}
	// Beside the crosshair, never on top of the point.
	const tipLeft = $derived(hover == null ? 0 : x(hover) + 152 <= width ? x(hover) + 12 : Math.max(0, x(hover) - 152));
</script>

<!-- Keyboard-explorable chart: arrows move the crosshair, the tooltip is announced. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	class="chart relative"
	bind:clientWidth={width}
	role="application"
	aria-roledescription="chart"
	aria-label="{name}. Use left and right arrow keys to read each point."
	tabindex="0"
	onpointermove={move}
	onpointerleave={() => (hover = null)}
	onkeydown={key}
	onblur={() => (hover = null)}
>
	<svg width={width} height={top + H + axis} aria-hidden="true">
		{#each ticks as t (t)}
			<line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} class="grid" />
			<text x={left - 6} y={y(t)} dy="0.32em" text-anchor="end" class="tick">{t}{unit}</text>
		{/each}
		{#each points as p, i (i)}
			{#if i % every === 0 || (i === points.length - 1 && i % every >= every / 2)}
				<text x={x(i)} y={top + H + 17} text-anchor="middle" class="tick">{p.label}</text>
			{/if}
		{/each}
		{#each segments as seg, i (i)}
			<path d={area(seg)} class="area" />
			<path d={line(seg)} class="line" />
			{#if seg.length === 1}<circle cx={seg[0].x} cy={seg[0].y} r="4" class="dot" />{/if}
		{/each}
		{#if lastIdx >= 0 && hover == null}
			<circle cx={x(lastIdx)} cy={y(points[lastIdx].value!)} r="4.5" class="dot" />
			<text x={x(lastIdx) + 8} y={y(points[lastIdx].value!)} dy="0.32em" class="end">{points[lastIdx].value}{unit}</text>
		{/if}
		{#if hover != null}
			<line x1={x(hover)} x2={x(hover)} y1={top} y2={top + H} class="cross" />
			{#if points[hover].value != null}<circle cx={x(hover)} cy={y(points[hover].value!)} r="5" class="dot" />{/if}
		{/if}
	</svg>
	{#if hover != null}
		<div class="tip" style:left="{tipLeft}px" role="status">
			<strong>{points[hover].value == null ? 'No classes' : `${points[hover].value}${unit}`}</strong>
			<span>{points[hover].tip}</span>
		</div>
	{/if}
</div>

<style>
	svg {
		display: block;
		overflow: visible;
	}
	.chart {
		touch-action: pan-y;
		outline: none;
		border-radius: 8px;
	}
	.chart:focus-visible {
		box-shadow: 0 0 0 3px var(--color-haldi);
	}
	.grid {
		stroke: var(--color-chart-grid);
		stroke-width: 1;
	}
	.tick {
		fill: var(--color-ink-soft);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.end {
		fill: var(--color-ink);
		font-size: 12px;
		font-weight: 800;
	}
	.line {
		fill: none;
		stroke: var(--color-chart-1);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.area {
		fill: var(--color-chart-1);
		opacity: 0.1;
	}
	.dot {
		fill: var(--color-chart-1);
		stroke: var(--color-surface);
		stroke-width: 2;
	}
	.cross {
		stroke: var(--color-ink-soft);
		stroke-width: 1;
		opacity: 0.5;
	}
	.tip {
		position: absolute;
		top: 4px;
		width: 140px;
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
		font-size: 0.95rem;
	}
</style>

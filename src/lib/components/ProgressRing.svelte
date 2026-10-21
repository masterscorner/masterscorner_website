<script lang="ts">
	// Small ring showing present out of total, number in the middle.
	let { value, total, size = 64 }: { value: number; total: number; size?: number } = $props();
	const r = 26;
	const c = 2 * Math.PI * r;
	const share = $derived(total > 0 ? Math.min(1, value / total) : 0);
</script>

<svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="{value} of {total} present">
	<circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-line)" stroke-width="7" />
	<circle
		cx="32"
		cy="32"
		r={r}
		fill="none"
		stroke="var(--color-present)"
		stroke-width="7"
		stroke-linecap="round"
		stroke-dasharray={c}
		stroke-dashoffset={c * (1 - share)}
		transform="rotate(-90 32 32)"
		style="transition: stroke-dashoffset 600ms ease"
	/>
	<text x="32" y="37" text-anchor="middle" font-size="15" font-weight="800" fill="var(--color-ink)" class="tnum">{value}/{total}</text>
</svg>

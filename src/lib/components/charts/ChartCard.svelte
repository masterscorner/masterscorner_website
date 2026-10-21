<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, sub, children, table }: { title: string; sub?: string; children: Snippet; table?: Snippet } = $props();
</script>

<section class="panel grid gap-3 p-4 sm:p-5" aria-label={title}>
	<header>
		<h2 class="text-[1.05rem] leading-snug">{title}</h2>
		{#if sub}<p class="text-sm text-ink-soft">{sub}</p>{/if}
	</header>
	{@render children()}
	{#if table}
		<details class="text-sm">
			<summary class="w-fit cursor-pointer font-semibold text-ink-soft">Show numbers</summary>
			<div class="mt-2 overflow-x-auto">{@render table()}</div>
		</details>
	{/if}
</section>

<style>
	section :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}
	section :global(th),
	section :global(td) {
		padding: 0.35rem 0.5rem;
		border-bottom: 1px solid var(--color-line);
		text-align: right;
		white-space: nowrap;
	}
	section :global(th:first-child),
	section :global(td:first-child) {
		text-align: left;
	}
	section :global(th) {
		color: var(--color-ink-soft);
		font-weight: 700;
	}
</style>

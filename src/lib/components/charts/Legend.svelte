<script lang="ts">
	let { items }: { items: { label: string; swatch: string }[] } = $props();
</script>

<ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
	{#each items as it (it.label)}
		<li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm" style:background={it.swatch} aria-hidden="true"></span>{it.label}</li>
	{/each}
</ul>

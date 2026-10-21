<script lang="ts">
	// A thin band of the class's real level colours (belt colours for karate, grade colours for others).
	let { colors = [], height = 6 }: { colors?: string[]; height?: number } = $props();
	const shown = $derived(colors.length ? colors : ['#22307a']);
</script>

<div class="stripe" style:height="{height}px" aria-hidden="true">
	{#each shown as c, i (i)}
		<span style:background={c}></span>
	{/each}
</div>

<style>
	.stripe {
		display: flex;
		width: 100%;
		overflow: hidden;
	}
	span {
		flex: 1;
		/* light belt colours (white) need an edge to be seen */
		box-shadow: inset 0 -1px 0 rgb(0 0 0 / 0.08);
	}
</style>

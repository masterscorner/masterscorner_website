<script lang="ts">
	import type { Snippet } from 'svelte';
	import SiteHeader from './SiteHeader.svelte';

	let { title, subtitle, signedIn = false, children }: { title: string; subtitle?: string; signedIn?: boolean; children: Snippet } = $props();
</script>

<div class="hero-bg pb-24">
	<SiteHeader onHero {signedIn} />
	<div class="mx-auto max-w-md px-4 pt-4">
		<h1 class="text-[2rem]">{title}</h1>
		{#if subtitle}<p class="mt-1 text-white/80">{subtitle}</p>{/if}
	</div>
</div>
<main class="relative z-10 mx-auto -mt-20 max-w-md px-4 pb-16">
	{@render children()}
</main>

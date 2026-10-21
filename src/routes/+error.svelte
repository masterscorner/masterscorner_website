<script lang="ts">
	import { page } from '$app/state';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
</script>

<svelte:head><title>{page.status === 404 ? 'Page not found' : 'Something went wrong'} | MastersCorner</title></svelte:head>

<SiteHeader />
<main class="mx-auto max-w-md px-4 pt-6">
	<h1 class="text-[1.8rem]">{page.status === 404 ? 'Page not found' : 'Something went wrong'}</h1>
	<p class="mt-2 text-ink-soft">{page.error?.message}</p>
	<a href="/" class="btn btn-primary mt-6">Go to home</a>
</main>

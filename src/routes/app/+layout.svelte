<script lang="ts">
	import { onMount } from 'svelte';
	import { flushAttendance } from '#lib/offline-queue.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => {
		const send = () => void flushAttendance();
		send();
		window.addEventListener('online', send);
		return () => window.removeEventListener('online', send);
	});
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

{@render children()}

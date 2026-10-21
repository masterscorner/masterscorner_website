<script lang="ts">
	// Goes back to the page you came from. If you opened this page directly (link, refresh),
	// it goes to `href` instead.
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import { canGoBack } from '#lib/nav-history.ts';

	let { href, label = 'Back' }: { href: string; label?: string } = $props();

	function back(event: MouseEvent) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		if (canGoBack()) {
			event.preventDefault();
			history.back();
		}
	}
</script>

<a {href} onclick={back} class="mb-2 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-ink-soft no-underline"><ChevronLeft size={16} aria-hidden="true" />{label}</a>

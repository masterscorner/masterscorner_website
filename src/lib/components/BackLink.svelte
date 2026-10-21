<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	let { href, label = 'Back' }: { href: string; label?: string } = $props();
</script>

<a {href} class="mb-2 inline-flex items-center gap-1 text-sm font-bold text-ink-soft no-underline"><ChevronLeft size={16} aria-hidden="true" />{label}</a>

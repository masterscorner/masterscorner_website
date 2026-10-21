<script lang="ts">
	// Mark: an "M" drawn as two people with raised arms (teacher and student), in saffron.
	let { size = 38 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
	<circle cx="12" cy="9" r="4.2" fill="#f37a2b" />
	<circle cx="28" cy="9" r="4.2" fill="#ffb703" />
	<path d="M4 34 L9.5 16 L20 27 L30.5 16 L36 34" fill="none" stroke="#f26b1d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
</svg>

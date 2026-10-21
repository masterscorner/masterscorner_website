<script lang="ts">
	// "What?" box: type anything (karate, Bharatanatyam, a class name). Suggestions come from the activity list.
	import Search from '@lucide/svelte/icons/search';

	let { suggestions, value = '', label = 'What do you want to learn?' }: { suggestions: string[]; value?: string; label?: string } = $props();
</script>

<div class="field">
	<label for="what-q" class="font-semibold">{label}</label>
	<div class="relative">
		<Search size={18} class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
		<input
			id="what-q"
			class="input pl-10"
			type="search"
			name="q"
			list="what-list"
			enterkeyhint="search"
			autocomplete="off"
			placeholder="Karate, dance, music, a class name…"
			defaultValue={value}
		/>
	</div>
</div>
<datalist id="what-list">
	{#each suggestions as s (s)}
		<option value={s}></option>
	{/each}
</datalist>

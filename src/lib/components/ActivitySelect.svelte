<script lang="ts">
	interface Group {
		id: number;
		name: string;
		emoji: string | null;
		items: { id: number; name: string; emoji: string | null }[];
	}
	let { groups, name, value = '', required = false, placeholder = 'Choose' }: {
		groups: Group[];
		name: string;
		value?: string;
		required?: boolean;
		placeholder?: string;
	} = $props();
</script>

<select class="input" {name} {required}>
	<option value="">{placeholder}</option>
	{#each groups as g (g.id)}
		<optgroup label="{g.emoji} {g.name}">
			{#each g.items as a (a.id)}
				<option value={a.id} selected={value === String(a.id)}>{a.emoji} {a.name}</option>
			{/each}
		</optgroup>
	{/each}
</select>

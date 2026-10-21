<script lang="ts">
	// An on/off switch that is a real checkbox underneath (works without JavaScript).
	let { name, checked = false, label, hint }: { name: string; checked?: boolean; label: string; hint?: string } = $props();
</script>

<label class="toggle">
	<span class="grid">
		<span class="font-semibold">{label}</span>
		{#if hint}<small class="text-ink-soft">{hint}</small>{/if}
	</span>
	<input type="checkbox" {name} defaultChecked={checked} />
	<span class="track" aria-hidden="true"><span class="knob"></span></span>
</label>

<style>
	.toggle {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 48px;
		cursor: pointer;
	}
	input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.track {
		flex-shrink: 0;
		position: relative;
		width: 3.1rem;
		height: 1.85rem;
		border-radius: 999px;
		background: var(--color-line);
		transition: background-color 180ms ease;
	}
	.knob {
		position: absolute;
		top: 0.2rem;
		left: 0.2rem;
		width: 1.45rem;
		height: 1.45rem;
		border-radius: 999px;
		background: white;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
		transition: transform 200ms var(--ease-spring);
	}
	input:checked + .track {
		background: var(--color-present);
	}
	input:checked + .track .knob {
		transform: translateX(1.25rem);
	}
	input:focus-visible + .track {
		outline: 3px solid var(--color-haldi);
		outline-offset: 2px;
	}
</style>

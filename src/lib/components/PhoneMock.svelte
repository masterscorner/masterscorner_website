<script lang="ts">
	// A small drawing of the attendance screen, to show teachers what they get.
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
</script>

<div class="phone" aria-hidden="true">
	<div class="screen">
		<p class="ph-title">Evening batch</p>
		<p class="ph-sub">Today, 5:30 PM</p>
		<div class="ph-pills"><span class="ok">✓ 3 present</span><span class="no">✗ 1 absent</span></div>
		{#each [['Divya', true], ['Harini', false], ['Kavya', true], ['Sanjay', true]] as [name, here] (name)}
			<div class="ph-row" class:absent={!here}>
				<span class="ph-av">{String(name)[0]}</span>
				<span class="ph-name">{name}</span>
				<span class="ph-btn" class:on={here}><Check size={14} /></span>
				<span class="ph-btn no" class:on={!here}><X size={14} /></span>
			</div>
		{/each}
		<div class="ph-save">Save attendance</div>
	</div>
</div>

<style>
	.phone {
		justify-self: center;
		width: 15.5rem;
		padding: 0.6rem;
		border-radius: 2.4rem;
		background: #0a1a30;
		box-shadow:
			0 0 0 2px rgb(255 255 255 / 0.08),
			0 30px 60px -20px rgb(0 0 0 / 0.6);
		transform: rotate(3deg);
	}
	.screen {
		border-radius: 1.85rem;
		background: #fbf7f2;
		color: #10233f;
		padding: 1.1rem 0.8rem 0.9rem;
		display: grid;
		gap: 0.45rem;
	}
	.ph-title {
		font-weight: 800;
		font-size: 1rem;
	}
	.ph-sub {
		font-size: 0.75rem;
		color: #5b6475;
		margin-top: -0.35rem;
	}
	.ph-pills {
		display: flex;
		gap: 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
	}
	.ph-pills .ok {
		background: #e2f7ec;
		color: #0f8f52;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
	}
	.ph-pills .no {
		background: #fdeceb;
		color: #d93a2f;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
	}
	.ph-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		background: white;
		border-radius: 0.9rem;
		padding: 0.35rem 0.4rem;
		border-left: 3px solid #0f8f52;
	}
	.ph-row.absent {
		background: #fdeceb;
		border-left-color: #d93a2f;
	}
	.ph-av {
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		background: #fff0e4;
		font-size: 0.7rem;
		font-weight: 800;
		color: #c2470b;
	}
	.ph-name {
		flex: 1;
		font-size: 0.8rem;
		font-weight: 700;
	}
	.ph-btn {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.4rem;
		border-radius: 0.5rem;
		border: 1px solid #ece4da;
		color: #5b6475;
	}
	.ph-btn.on {
		background: #0f8f52;
		border-color: #0f8f52;
		color: white;
	}
	.ph-btn.no.on {
		background: #d93a2f;
		border-color: #d93a2f;
	}
	.ph-save {
		margin-top: 0.2rem;
		text-align: center;
		font-weight: 800;
		font-size: 0.8rem;
		color: white;
		padding: 0.55rem;
		border-radius: 0.8rem;
		background: linear-gradient(180deg, #f26b1d, #e0560c);
	}
</style>

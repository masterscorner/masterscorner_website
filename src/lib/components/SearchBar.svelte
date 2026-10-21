<script lang="ts">
	// One-line search like the big Indian apps: city | what | orange button. Stacks on phones.
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import LocateFixed from '@lucide/svelte/icons/locate-fixed';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Search from '@lucide/svelte/icons/search';
	import { CITIES } from '#lib/cities.ts';

	let {
		city = '',
		q = '',
		activity = '',
		suggestions,
		autofocusCity = false
	}: { city?: string; q?: string; activity?: string; suggestions: string[]; autofocusCity?: boolean } = $props();

	let cityEl: HTMLInputElement | undefined = $state();
	let lat = $state('');
	let lng = $state('');
	let locating = $state(false);
	let message = $state('');

	$effect(() => {
		if (autofocusCity) cityEl?.focus();
	});

	function nearMe(event: MouseEvent) {
		const form = (event.currentTarget as HTMLElement).closest('form');
		if (!('geolocation' in navigator)) {
			message = 'Your phone cannot share location. Type your city.';
			return;
		}
		locating = true;
		message = '';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				lat = pos.coords.latitude.toFixed(5);
				lng = pos.coords.longitude.toFixed(5);
				if (cityEl) cityEl.value = 'Near me';
				locating = false;
				queueMicrotask(() => form?.requestSubmit());
			},
			() => {
				locating = false;
				message = 'Location is off. Type your city instead.';
			},
			{ enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
		);
	}
</script>

<form method="GET" action="/search" class="bar" role="search">
	<div class="cell city">
		<MapPin size={19} class="ico text-brand" aria-hidden="true" />
		<label for="sb-city" class="visually-hidden">Your city</label>
		<input
			id="sb-city"
			name="city"
			list="sb-cities"
			autocomplete="address-level2"
			placeholder="Your city"
			defaultValue={city}
			bind:this={cityEl}
			oninput={() => {
				lat = '';
				lng = '';
			}}
		/>
		<button type="button" class="near" onclick={nearMe} disabled={locating} aria-label="Use my location">
			<LocateFixed size={18} aria-hidden="true" /><span class="hidden lg:inline">{locating ? 'Finding…' : 'Near me'}</span>
		</button>
	</div>
	<div class="cell what">
		<Search size={19} class="ico text-ink-soft" aria-hidden="true" />
		<label for="sb-q" class="visually-hidden">What do you want to learn?</label>
		<input id="sb-q" type="search" name="q" list="sb-what" enterkeyhint="search" autocomplete="off" placeholder="What would you like to learn?" defaultValue={q} />
	</div>
	{#if activity}<input type="hidden" name="activity" value={activity} />{/if}
	<input type="hidden" name="lat" value={lat} />
	<input type="hidden" name="lng" value={lng} />
	<button class="btn btn-primary go" type="submit">Find classes <ArrowRight size={19} aria-hidden="true" /></button>
</form>
{#if message}<p class="error-text mt-2 text-sm">{message}</p>{/if}

<datalist id="sb-cities">
	{#each CITIES as c (c.name)}<option value={c.name}></option>{/each}
</datalist>
<datalist id="sb-what">
	{#each suggestions as s (s)}<option value={s}></option>{/each}
</datalist>

<style>
	.bar {
		display: grid;
		gap: 0.6rem;
		padding: 0.6rem;
		border-radius: 22px;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
		box-shadow: var(--shadow-float);
	}
	@media (min-width: 768px) {
		.bar {
			grid-template-columns: minmax(14rem, 0.9fr) 1.6fr auto;
		}
	}
	.cell {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 54px;
		padding: 0 0.5rem 0 0.95rem;
		border-radius: 15px;
		border: 1.5px solid var(--color-line);
		background: var(--color-surface);
		transition: border-color 140ms ease;
	}
	.cell:focus-within {
		border-color: var(--color-brand);
		box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-brand) 16%, transparent);
	}
	.cell :global(.ico) {
		flex-shrink: 0;
	}
	.cell input {
		flex: 1;
		min-width: 0;
		height: 100%;
		min-height: 50px;
		border: 0;
		background: transparent;
		font-size: 1.02rem;
		font-weight: 600;
		outline: none;
	}
	.cell input::placeholder {
		color: var(--color-ink-soft);
		font-weight: 500;
	}
	.near {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		min-height: 40px;
		padding: 0 0.6rem;
		border-radius: 11px;
		font-weight: 700;
		font-size: 0.85rem;
		color: var(--color-indigo);
		background: var(--color-indigo-soft);
		cursor: pointer;
		border: 0;
	}
	.go {
		min-height: 56px;
		border-radius: 15px;
		font-size: 1.05rem;
		padding: 0 1.6rem;
	}
</style>

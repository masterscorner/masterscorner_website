<script lang="ts">
	// "Where?" input: type a city, or tap "Near me" to use the phone's location.
	import LocateFixed from '@lucide/svelte/icons/locate-fixed';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import { CITIES } from '#lib/cities.ts';

	let { city = '' }: { city?: string } = $props();
	let inputEl: HTMLInputElement | undefined = $state();
	let lat = $state('');
	let lng = $state('');
	let locating = $state(false);
	let message = $state('');

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
				if (inputEl) inputEl.value = 'Near me';
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

<div class="field">
	<label for="where-city" class="font-semibold">Where?</label>
	<div class="flex gap-2">
		<div class="relative min-w-0 flex-1">
			<MapPin size={18} class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
			<input
				id="where-city"
				class="input pl-10"
				name="city"
				list="city-list"
				autocomplete="address-level2"
				placeholder="Your city"
				defaultValue={city}
				bind:this={inputEl}
				oninput={() => {
					lat = '';
					lng = '';
				}}
			/>
		</div>
		<button type="button" class="btn btn-quiet shrink-0 px-3" onclick={nearMe} disabled={locating} aria-label="Use my location">
			<LocateFixed size={20} aria-hidden="true" />
			<span class="hidden sm:inline">{locating ? 'Finding…' : 'Near me'}</span>
		</button>
	</div>
	{#if message}<small class="error-text">{message}</small>{/if}
</div>
<input type="hidden" name="lat" value={lat} />
<input type="hidden" name="lng" value={lng} />
<datalist id="city-list">
	{#each CITIES as c (c.name)}
		<option value={c.name}></option>
	{/each}
</datalist>

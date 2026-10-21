<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import LocateFixed from '@lucide/svelte/icons/locate-fixed';
	import ActivitySelect from '#lib/components/ActivitySelect.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import { CITIES } from '#lib/cities.ts';
	import { AGE_GROUPS, DAYS, LANGUAGES } from '#lib/options.ts';
	import { formatPhone } from '#lib/phone.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const val = (k: string): string => {
		const v = (form?.values as Record<string, unknown> | undefined)?.[k];
		return typeof v === 'string' ? v : '';
	};
	const list = (k: 'days' | 'languages' | 'ages'): string[] => (form?.values as Record<string, string[]> | undefined)?.[k] ?? [];

	let lat = $state(val('lat'));
	let lng = $state(val('lng'));
	let pinMessage = $state(untrack(() => lat) ? 'Location saved.' : '');
	let saving = $state(false);
	let moreActivities = $state(Boolean(val('activity2')));

	function pin() {
		if (!('geolocation' in navigator)) {
			pinMessage = 'This phone cannot share location. We will use your city.';
			return;
		}
		pinMessage = 'Finding your location…';
		navigator.geolocation.getCurrentPosition(
			(p) => {
				lat = p.coords.latitude.toFixed(6);
				lng = p.coords.longitude.toFixed(6);
				pinMessage = 'Location saved. Students will see the exact place on the map.';
			},
			() => (pinMessage = 'Location is off. We will use your city for now.'),
			{ enableHighAccuracy: true, timeout: 15000 }
		);
	}
</script>

<svelte:head><title>Start my class | MastersCorner</title></svelte:head>

<SiteHeader signedIn />

<main class="mx-auto max-w-xl px-4 pb-20">
	<h1 class="text-[1.8rem]">Start my class</h1>
	<p class="mt-1 text-ink-soft">Takes about 3 minutes. You can change everything later.</p>

	<form
		method="POST"
		class="mt-5 grid gap-6"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update({ reset: false });
				saving = false;
			};
		}}
	>
		<fieldset class="panel grid gap-4 p-5">
			<legend class="step"><span class="num" aria-hidden="true">1</span> Your class</legend>
			<label class="field"><span>Class name</span><input class="input" name="name" required maxlength="80" placeholder="For example: Sri Murugan Karate Academy" defaultValue={val('name')} /></label>
			<label class="field"><span>What do you teach?</span><ActivitySelect groups={data.groups} name="activity1" value={val('activity1')} required /></label>
			{#if moreActivities}
				<label class="field"><span>Also teach (optional)</span><ActivitySelect groups={data.groups} name="activity2" value={val('activity2')} placeholder="Nothing else" /></label>
				<label class="field"><span>And (optional)</span><ActivitySelect groups={data.groups} name="activity3" value={val('activity3')} placeholder="Nothing else" /></label>
			{:else}
				<button type="button" class="w-fit text-indigo underline" onclick={() => (moreActivities = true)}>+ I teach more than one</button>
			{/if}
		</fieldset>

		<fieldset class="panel grid gap-4 p-5">
			<legend class="step"><span class="num" aria-hidden="true">2</span> Where</legend>
			<label class="field"><span>City</span><input class="input" name="city" list="start-cities" required defaultValue={val('city')} autocomplete="address-level2" /></label>
			<label class="field"><span>Address</span><input class="input" name="address_line" required maxlength="200" placeholder="Door number, street, building" defaultValue={val('address_line')} autocomplete="street-address" /></label>
			<div class="grid grid-cols-2 gap-3">
				<label class="field"><span>Area</span><input class="input" name="locality" maxlength="80" placeholder="Anna Nagar" defaultValue={val('locality')} /></label>
				<label class="field"><span>PIN code</span><input class="input" name="postal_code" inputmode="numeric" maxlength="6" defaultValue={val('postal_code')} autocomplete="postal-code" /></label>
			</div>
			<button type="button" class="btn btn-quiet" onclick={pin}><LocateFixed size={20} aria-hidden="true" /> I am at my class now</button>
			{#if pinMessage}<p class="text-sm" role="status">{pinMessage}</p>{/if}
			<input type="hidden" name="lat" value={lat} />
			<input type="hidden" name="lng" value={lng} />
			<small class="text-ink-soft">The address is shown to everyone so students can find you.</small>
		</fieldset>

		<fieldset class="panel grid gap-4 p-5">
			<legend class="step"><span class="num" aria-hidden="true">3</span> First batch</legend>
			<label class="field"><span>Batch name</span><input class="input" name="batch_name" required maxlength="60" defaultValue={val('batch_name') || 'Evening batch'} /></label>
			<div class="field">
				<span>Days</span>
				<div class="flex flex-wrap gap-2">
					{#each DAYS as d (d.value)}
						<label class="chip"><input type="checkbox" name="days" value={d.value} checked={list('days').includes(String(d.value))} />{d.label}</label>
					{/each}
				</div>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<label class="field"><span>Starts</span><input class="input" type="time" name="start" required defaultValue={val('start') || '17:00'} /></label>
				<label class="field"><span>Ends</span><input class="input" type="time" name="end" required defaultValue={val('end') || '18:00'} /></label>
			</div>
			<div class="grid grid-cols-[1fr_1fr] gap-3">
				<label class="field"><span>Fee (₹)</span><input class="input" name="fee" inputmode="numeric" maxlength="6" placeholder="800" defaultValue={val('fee')} /></label>
				<label class="field"><span>Per</span>
					<select class="input" name="fee_period">
						{#each [['month', 'Month'], ['quarter', '3 months'], ['term', 'Term'], ['class', 'Class']] as [v, l] (v)}
							<option value={v} selected={val('fee_period') === v}>{l}</option>
						{/each}
					</select>
				</label>
			</div>
		</fieldset>

		<fieldset class="panel grid gap-4 p-5">
			<legend class="step"><span class="num" aria-hidden="true">4</span> Contact and details</legend>
			<label class="field"><span>WhatsApp number</span><input class="input" name="whatsapp" inputmode="tel" defaultValue={val('whatsapp') || (data.myPhone ? formatPhone(data.myPhone) : '')} /></label>
			<label class="flex items-center gap-3"><input type="checkbox" name="show_whatsapp" class="h-6 w-6" checked={form ? val('show_whatsapp') === 'on' : true} /> Show a WhatsApp button on my page</label>
			<label class="field"><span>Phone number (optional)</span><input class="input" name="phone" inputmode="tel" defaultValue={val('phone')} /></label>
			<label class="flex items-center gap-3"><input type="checkbox" name="show_phone" class="h-6 w-6" checked={val('show_phone') === 'on'} /> Show a Call button on my page</label>
			<div class="field">
				<span>I teach in</span>
				<div class="flex flex-wrap gap-2">
					{#each LANGUAGES as l (l)}
						<label class="chip"><input type="checkbox" name="languages" value={l} checked={list('languages').includes(l)} />{l}</label>
					{/each}
				</div>
			</div>
			<div class="field">
				<span>Who can join</span>
				<div class="flex flex-wrap gap-2">
					{#each AGE_GROUPS as a (a.value)}
						<label class="chip"><input type="checkbox" name="ages" value={a.value} checked={list('ages').includes(a.value)} />{a.label}</label>
					{/each}
				</div>
			</div>
			<label class="field"><span>UPI ID for fees (optional)</span><input class="input" name="upi_id" placeholder="yourname@okaxis" defaultValue={val('upi_id')} autocapitalize="none" /><small>Students pay you directly. MastersCorner never holds your money.</small></label>
		</fieldset>

		{#if form?.error}<p class="error-text" role="alert">{form.error}</p>{/if}
		<button class="btn btn-primary text-lg" disabled={saving}>{saving ? 'Saving…' : 'Create my class'}</button>
	</form>
	<datalist id="start-cities">
		{#each CITIES as c (c.name)}<option value={c.name}></option>{/each}
	</datalist>
</main>

<style>
	.step {
		font-family: var(--font-display);
		font-weight: 750;
		font-size: 1.15rem;
		color: var(--color-indigo-deep);
		padding: 0 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.num {
		display: inline-grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 999px;
		background: var(--color-haldi);
		color: var(--color-indigo-deep);
		font-size: 0.95rem;
	}
</style>

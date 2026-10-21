<script lang="ts">
	import { enhance } from '$app/forms';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import LocateFixed from '@lucide/svelte/icons/locate-fixed';
	import ActivitySelect from '#lib/components/ActivitySelect.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { CITIES } from '#lib/cities.ts';
	import { AGE_GROUPS, LANGUAGES } from '#lib/options.ts';
	import { formatPhone } from '#lib/phone.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const s = $derived(data.settings);
	let saving = $state<string | null>(null);
	let lat = $state('');
	let lng = $state('');
	let pinMessage = $state('');

	const submit = (which: string) => () => {
		saving = which;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			saving = null;
		};
	};

	function pin() {
		if (!('geolocation' in navigator)) {
			pinMessage = 'This phone cannot share location.';
			return;
		}
		pinMessage = 'Finding your location…';
		navigator.geolocation.getCurrentPosition(
			(p) => {
				lat = p.coords.latitude.toFixed(6);
				lng = p.coords.longitude.toFixed(6);
				pinMessage = 'New location ready. Tap "Save address".';
			},
			() => (pinMessage = 'Location is off on this phone.'),
			{ enableHighAccuracy: true, timeout: 15000 }
		);
	}
</script>

<svelte:head><title>Class page settings | {data.org.name}</title></svelte:head>

<BackLink href="/app/c/{data.org.id}/more" label="More" />
<div class="flex items-center justify-between gap-3">
	<h1 class="text-[1.8rem]">Class page</h1>
	<a class="btn btn-quiet min-h-10 px-3 text-sm" href="/c/{s.slug}" target="_blank"><ExternalLink size={16} aria-hidden="true" /> View</a>
</div>

{#if form && 'message' in form}<p class="mt-3 rounded-xl bg-present-soft p-3 font-semibold text-present" role="status">{form.message}</p>{/if}
{#if form && 'error' in form}<p class="error-text mt-3" role="alert">{form.error}</p>{/if}

<form method="POST" action="?/details" class="mt-4 grid gap-5" use:enhance={submit('details')}>
	<section class="panel grid gap-4 p-5">
		<h2 class="text-lg">About the class</h2>
		<label class="field"><span>Class name</span><input class="input" name="name" required maxlength="80" defaultValue={s.name} /></label>
		<label class="field"><span>What you teach</span><ActivitySelect groups={data.groups} name="activity1" value={String(s.activity_ids[0] ?? '')} required /></label>
		<label class="field"><span>Also (optional)</span><ActivitySelect groups={data.groups} name="activity2" value={String(s.activity_ids[1] ?? '')} placeholder="Nothing else" /></label>
		<label class="field"><span>And (optional)</span><ActivitySelect groups={data.groups} name="activity3" value={String(s.activity_ids[2] ?? '')} placeholder="Nothing else" /></label>
		<label class="field">
			<span>About (optional)</span>
			<textarea class="input min-h-28" name="about" maxlength="2000" placeholder="Your experience, style, awards, what students learn">{s.about ?? ''}</textarea>
		</label>
	</section>

	<section class="panel grid gap-2 p-5">
		<h2 class="mb-2 text-lg">Contact</h2>
		<label class="field"><span>WhatsApp number</span><input class="input" name="whatsapp" inputmode="tel" defaultValue={s.whatsapp_e164 ? formatPhone(s.whatsapp_e164) : ''} /></label>
		<Toggle name="show_whatsapp" checked={s.show_whatsapp} label="Show WhatsApp button" />
		<label class="field mt-2"><span>Phone number</span><input class="input" name="phone" inputmode="tel" defaultValue={s.phone_e164 ? formatPhone(s.phone_e164) : ''} /></label>
		<Toggle name="show_phone" checked={s.show_phone} label="Show Call button" />
		<label class="field mt-2"><span>Email (optional)</span><input class="input" name="email" type="email" defaultValue={s.email ?? ''} /></label>
		<Toggle name="show_email" checked={s.show_email} label="Show email" />
		<p class="text-sm text-ink-soft">The address is always shown so students can find you.</p>
	</section>

	<section class="panel grid gap-4 p-5">
		<h2 class="text-lg">Details</h2>
		<div class="field">
			<span>I teach in</span>
			<div class="flex flex-wrap gap-2">
				{#each LANGUAGES as l (l)}
					<label class="chip"><input type="checkbox" name="languages" value={l} defaultChecked={s.teaching_languages.includes(l)} />{l}</label>
				{/each}
			</div>
		</div>
		<div class="field">
			<span>Who can join</span>
			<div class="flex flex-wrap gap-2">
				{#each AGE_GROUPS as a (a.value)}
					<label class="chip"><input type="checkbox" name="ages" value={a.value} defaultChecked={s.age_groups.includes(a.value)} />{a.label}</label>
				{/each}
			</div>
		</div>
		<div class="grid gap-1">
			<Toggle name="women_only" checked={s.women_only} label="Women only" />
			<Toggle name="online" checked={s.online} label="Online classes too" />
		</div>
	</section>

	<section class="panel grid gap-4 p-5">
		<h2 class="text-lg">Fees</h2>
		<label class="field"><span>UPI ID</span><input class="input" name="upi_id" placeholder="yourname@okaxis" defaultValue={s.upi_id ?? ''} autocapitalize="none" /><small>Students pay you directly. MastersCorner never holds your money.</small></label>
		<label class="field"><span>Fees due on day</span><input class="input w-28" name="fee_due_day" type="number" min="1" max="28" defaultValue={String(s.fee_due_day)} /><small>Day of the month, for example 10.</small></label>
	</section>

	<section class="panel p-5">
		<Toggle name="published" checked={s.status === 'published'} label="Show my class in search" hint="Turn off to hide your page while you get ready." />
	</section>

	<button class="btn btn-primary" disabled={saving === 'details'}>{saving === 'details' ? 'Saving…' : 'Save'}</button>
</form>

{#if s.branch}
	<form method="POST" action="?/address" class="panel mt-8 grid gap-4 p-5" use:enhance={submit('address')}>
		<h2 class="text-lg">Address</h2>
		<input type="hidden" name="branch" value={s.branch.id} />
		<input type="hidden" name="old_city" value={s.branch.city} />
		<input type="hidden" name="old_lat" value={s.branch.lat} />
		<input type="hidden" name="old_lng" value={s.branch.lng} />
		<input type="hidden" name="old_precise" value={String(s.branch.location_precise)} />
		<input type="hidden" name="lat" value={lat} />
		<input type="hidden" name="lng" value={lng} />
		<label class="field"><span>City</span><input class="input" name="city" list="settings-cities" required defaultValue={s.branch.city} /></label>
		<label class="field"><span>Address</span><input class="input" name="address_line" required maxlength="200" defaultValue={s.branch.address_line} /></label>
		<div class="grid grid-cols-2 gap-3">
			<label class="field"><span>Area</span><input class="input" name="locality" maxlength="80" defaultValue={s.branch.locality ?? ''} /></label>
			<label class="field"><span>PIN code</span><input class="input" name="postal_code" inputmode="numeric" maxlength="6" defaultValue={s.branch.postal_code ?? ''} /></label>
		</div>
		<button type="button" class="btn btn-quiet" onclick={pin}><LocateFixed size={20} aria-hidden="true" /> I am at my class now</button>
		<p class="text-sm" role="status">
			{pinMessage || (s.branch.location_precise ? 'Map point: exact place.' : 'Map point: city centre only. Tap the button when you are at your class.')}
		</p>
		<button class="btn btn-primary" disabled={saving === 'address'}>{saving === 'address' ? 'Saving…' : 'Save address'}</button>
	</form>
{/if}
<datalist id="settings-cities">
	{#each CITIES as c (c.name)}<option value={c.name}></option>{/each}
</datalist>
<div class="h-6"></div>

<script lang="ts">
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const reasons = [
		['fake', 'Fake class or fake review'],
		['abusive', 'Rude or abusive'],
		['privacy', 'Shows my private details'],
		['impersonation', 'Pretends to be someone else'],
		['copyright', 'Uses my photo or work'],
		['child_safety', 'A child may be unsafe'],
		['other', 'Something else']
	];
</script>

<svelte:head><title>Report a problem | MastersCorner</title></svelte:head>

<SiteHeader />
<main class="mx-auto max-w-md px-4">
	<h1 class="text-[1.8rem]">Report a problem</h1>
	{#if data.type === 'safety'}
		<p class="mt-3 flex gap-2 rounded-xl bg-absent-soft p-3 font-semibold text-absent"><ShieldAlert size={22} class="shrink-0" aria-hidden="true" /> If a child is in danger now, call 112 or 1098 first.</p>
	{/if}
	{#if form?.sent}
		<p class="panel mt-4 p-4 font-semibold text-present" role="status">Thank you. We got your report and will reply within 24 hours.</p>
	{:else}
		<form method="POST" class="panel mt-4 grid gap-4 p-4">
			<input type="hidden" name="type" value={data.type ?? ''} />
			<input type="hidden" name="id" value={data.id ?? ''} />
			<fieldset class="field">
				<legend class="mb-2 font-semibold">What is wrong?</legend>
				<div class="grid gap-2">
					{#each reasons as [value, label] (value)}
						<label class="chip w-full justify-start"><input type="radio" name="reason" {value} required checked={data.type === 'safety' && value === 'child_safety'} />{label}</label>
					{/each}
				</div>
			</fieldset>
			<label class="field"><span>Tell us more</span><textarea class="input min-h-28" name="details" required minlength="10" maxlength="2000"></textarea></label>
			<label class="field"><span>Your phone (optional, so we can reply)</span><input class="input" name="phone" inputmode="tel" /></label>
			{#if form?.error}<p class="error-text" role="alert">{form.error}</p>{/if}
			<button class="btn btn-primary">Send report</button>
		</form>
	{/if}
</main>
<SiteFooter />

<script lang="ts">
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const years = $derived(Array.from({ length: 95 }, (_, i) => data.thisYear - 18 - i));
</script>

<svelte:head><title>Welcome | MastersCorner</title></svelte:head>

<AuthShell title="Welcome" subtitle="Two quick things, then you are ready." signedIn>
	<form method="POST" class="panel grid gap-5 p-5">
		<label class="field">
			<span>Your name</span>
			<input class="input" name="name" required maxlength="80" autocomplete="name" defaultValue={form?.values?.name ?? ''} />
			<small>Students and teachers will see this name.</small>
		</label>

		<label class="field">
			<span>Year you were born</span>
			<select class="input" name="birth_year" required>
				<option value="">Choose year</option>
				{#each years as y (y)}
					<option value={y} selected={form?.values?.birth_year === String(y)}>{y}</option>
				{/each}
				<option value={data.thisYear - 10} selected={Boolean(form && 'minor' in form)}>After {data.thisYear - 18}</option>
			</select>
			<small>You must be 18 or older. Children are added by a parent.</small>
		</label>

		<div class="rounded-xl bg-indigo-soft p-4 text-[0.95rem]">
			<p class="flex items-center gap-2 font-semibold text-indigo-deep"><ShieldCheck size={20} aria-hidden="true" /> How we use your details</p>
			<ul class="mt-2 grid list-disc gap-1 pl-5">
				<li>Your name and phone number: to sign you in and show you your classes.</li>
				<li>Year of birth: to check you are an adult.</li>
				<li>Classes you join see your name and attendance. They never see other classes' data.</li>
				<li>We do not sell your data or show you ads.</li>
				<li>You can download or delete your data any time in Settings.</li>
			</ul>
			<p class="mt-2"><a class="underline" href="/privacy" target="_blank">Read the full privacy notice</a></p>
		</div>

		<label class="flex items-start gap-3">
			<input type="checkbox" name="agree" class="mt-1 h-6 w-6 shrink-0" required />
			<span>I am 18 or older and I agree to the use of my details as written above.</span>
		</label>

		{#if form?.error}<p class="error-text" role="alert">{form.error}</p>{/if}
		<button class="btn btn-primary">Continue</button>
	</form>
</AuthShell>

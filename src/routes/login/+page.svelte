<script lang="ts">
	import { enhance } from '$app/forms';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import { formatPhone } from '#lib/phone.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const step = $derived(form?.step ?? 'phone');
	let busy = $state(false);

	const submit = () => {
		busy = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = false;
		};
	};
</script>

<svelte:head><title>Sign in | MastersCorner</title></svelte:head>

<AuthShell title="Sign in" subtitle="Teachers, students and parents use the same sign in.">

	{#if step === 'phone'}
		<form method="POST" action="?/send" class="panel grid gap-4 p-5" use:enhance={submit}>
			<label class="field">
				<span class="flex items-center gap-2"><Smartphone size={20} aria-hidden="true" /> Mobile number</span>
				<div class="flex items-stretch gap-2">
					<span class="input flex w-auto items-center bg-chalk px-3 font-semibold" aria-hidden="true">+91</span>
					<input
						class="input text-lg tracking-wide"
						name="phone"
						inputmode="tel"
						autocomplete="tel-national"
						placeholder="98765 43210"
						required
						defaultValue={form?.phone ?? ''}
						aria-describedby="phone-help"
					/>
				</div>
				<small id="phone-help">We send a 6 number code by SMS. Not in India? Type + and your country code.</small>
			</label>
			{#if form?.error}<p class="error-text" role="alert">{form.error}</p>{/if}
			<button class="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
		</form>

		{#if data.googleEnabled}
			<form method="POST" action="?/google" class="mt-3">
				<button class="btn btn-quiet w-full">
					<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-2.8-.4-4.1H24v7.7h12c-.2 2-1.6 5-4.6 7l7 5.4C42.6 36.6 45 31 45 24.5z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.2 5.6C8 40.9 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.5 28.3c-.5-1.4-.7-2.8-.7-4.3s.3-3 .7-4.3l-7.2-5.6A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.9z"/><path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.3 30 2 24 2 15.4 2 8 7.1 4.3 14.1l7.2 5.6C13.3 14.4 18.2 10.6 24 10.6z"/></svg>
					Sign in with Google
				</button>
			</form>
		{/if}
	{:else}
		<form method="POST" action="?/verify" class="panel grid gap-4 p-5" use:enhance={submit}>
			<input type="hidden" name="phone" value={form?.phone} />
			<p>Code sent to <strong>{formatPhone(form?.phone ?? '')}</strong></p>
			<label class="field">
				<span class="flex items-center gap-2"><KeyRound size={20} aria-hidden="true" /> 6 number code</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					class="input text-center text-2xl tracking-[0.4em]"
					name="code"
					inputmode="numeric"
					autocomplete="one-time-code"
					pattern="[0-9]*"
					maxlength="6"
					required
					autofocus
					defaultValue={form && 'devCode' in form ? (form.devCode ?? '') : ''}
				/>
				{#if form && 'devCode' in form && form.devCode}
					<p class="rounded-xl bg-haldi-soft p-3 text-sm font-semibold text-ink" role="status">
						Test mode (no SMS on this computer). Your code is <strong class="tnum text-base tracking-widest">{form.devCode}</strong>
					</p>
				{/if}
			</label>
			{#if form?.error}<p class="error-text" role="alert">{form.error}</p>{/if}
			<button class="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
			<a href="/login" class="text-center text-sm underline">Change number or send again</a>
		</form>
	{/if}

	<p class="mt-6 text-sm text-ink-soft">
		By signing in you agree to the <a class="underline" href="/terms">terms</a> and the <a class="underline" href="/privacy">privacy notice</a>.
	</p>
</AuthShell>

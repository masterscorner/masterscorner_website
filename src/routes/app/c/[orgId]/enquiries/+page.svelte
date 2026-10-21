<script lang="ts">
	import { enhance } from '$app/forms';
	import Baby from '@lucide/svelte/icons/baby';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Phone from '@lucide/svelte/icons/phone';
	import BackLink from '#lib/components/BackLink.svelte';
	import { shortDate } from '#lib/format.ts';
	import { formatPhone } from '#lib/phone.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const labels: Record<string, string> = { new: 'New', contacted: 'Contacted', trial_booked: 'Visit booked', joined: 'Joined', closed: 'Closed' };
	const tone: Record<string, string> = { new: 'warn', contacted: '', trial_booked: 'info', joined: 'good', closed: 'muted' };

	function wa(phone: string, name: string) {
		const text = `Hello ${name}, thank you for your question to ${data.org.name}.`;
		return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(text)}`;
	}
</script>

<svelte:head><title>Enquiries | {data.org.name}</title></svelte:head>

<BackLink href="/app/c/{data.org.id}/more" label="More" />
<h1 class="text-[1.8rem]">Enquiries</h1>
<p class="mt-1 text-ink-soft">Questions people sent from your class page. Call or message them, then mark what happened.</p>

{#if form && 'error' in form}<p class="error-text mt-3" role="alert">{form.error}</p>{/if}

{#if data.enquiries.length === 0}
	<div class="panel mt-5 grid justify-items-center gap-2 p-8 text-center">
		<span class="text-5xl" aria-hidden="true">📭</span>
		<p class="text-lg font-bold">No enquiries yet</p>
		<p class="max-w-[34ch] text-ink-soft">Share your class page on WhatsApp so more people can find you.</p>
	</div>
{:else}
	<ul class="mt-4 grid gap-3">
		{#each data.enquiries as e (e.id)}
			<li class="panel grid gap-3 p-4">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="flex items-center gap-2 font-extrabold">{e.name} {#if e.for_child}<span class="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-0.5 text-xs text-indigo-deep"><Baby size={13} aria-hidden="true" /> For child</span>{/if}</p>
						<p class="text-sm text-ink-soft">{formatPhone(e.phone_e164)}, {shortDate(e.created_at)}</p>
					</div>
					<span class="pill {tone[e.status]}">{labels[e.status]}</span>
				</div>
				{#if e.message}<p class="rounded-xl bg-chalk p-3">{e.message}</p>{/if}
				<div class="flex gap-2">
					<a class="btn btn-whatsapp min-h-10 flex-1 px-3 text-sm" href={wa(e.phone_e164, e.name)} target="_blank" rel="noopener"><MessageCircle size={16} aria-hidden="true" /> WhatsApp</a>
					<a class="btn btn-quiet min-h-10 flex-1 px-3 text-sm" href="tel:{e.phone_e164}"><Phone size={16} aria-hidden="true" /> Call</a>
				</div>
				<form method="POST" action="?/update" class="grid gap-2 border-t border-dashed border-line pt-3" use:enhance={() => async ({ update }) => update({ reset: false })}>
					<input type="hidden" name="id" value={e.id} />
					<div class="flex flex-wrap gap-1.5">
						{#each Object.entries(labels) as [value, label] (value)}
							<label class="chip min-h-9 px-3 text-sm"><input type="radio" name="status" {value} defaultChecked={e.status === value} />{label}</label>
						{/each}
					</div>
					<div class="flex gap-2">
						<input class="input min-h-10" name="note" maxlength="500" placeholder="Note (only you see this)" defaultValue={e.note ?? ''} />
						<button class="btn btn-quiet min-h-10 px-3 text-sm">Save</button>
					</div>
				</form>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.pill {
		flex-shrink: 0;
		padding: 0.2rem 0.65rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 800;
		background: var(--color-indigo-soft);
		color: var(--color-indigo-deep);
	}
	.pill.warn {
		background: var(--color-due-soft);
		color: var(--color-due);
	}
	.pill.good {
		background: var(--color-present-soft);
		color: var(--color-present);
	}
	.pill.muted {
		background: var(--color-line);
		color: var(--color-ink-soft);
	}
</style>

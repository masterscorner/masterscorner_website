<script lang="ts">
	import { enhance } from '$app/forms';
	import Banknote from '@lucide/svelte/icons/banknote';
	import Check from '@lucide/svelte/icons/check';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import { initials, rupees, shortDate } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const f = $derived(data.fees);
	let show = $state<'due' | 'paid' | 'all'>('due');
	let open = $state<string | null>(null);
	let showQr = $state(false);
	const share = $derived(f.totalPaise ? Math.round((f.collectedPaise / f.totalPaise) * 100) : 0);
	const rows = $derived(
		f.rows.filter((r) => (show === 'all' ? true : show === 'due' ? r.status === 'due' : r.status === 'paid' || r.status === 'waived'))
	);
	const base = $derived(`/app/c/${data.org.id}/fees`);
	const methodLabel: Record<string, string> = { cash: 'Cash', upi: 'UPI', bank: 'Bank', other: 'Other' };

	function reminder(r: (typeof f.rows)[number]) {
		if (!r.contact_phone) return null;
		const who = r.is_minor ? `fees for ${r.display_name}` : 'your fees';
		const pay = data.org.upi_id ? ` You can pay by UPI to ${data.org.upi_id}.` : '';
		const text = `Hello, this is a reminder from ${data.org.name}: ${who} for ${f.label} is ${rupees(r.amount_paise)}.${pay} Thank you.`;
		return `https://wa.me/${r.contact_phone.slice(1)}?text=${encodeURIComponent(text)}`;
	}

	const keep = () => {
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			open = null;
		};
	};
</script>

<svelte:head><title>Fees | {data.org.name}</title></svelte:head>

<div class="flex items-center justify-between gap-3">
	<h1 class="text-[1.9rem]">Fees</h1>
	<nav class="month" aria-label="Choose month">
		<a href="{base}?m={data.prev}" aria-label="Previous month"><ChevronLeft size={20} /></a>
		<span class="tnum">{f.label}</span>
		{#if data.next}<a href="{base}?m={data.next}" aria-label="Next month"><ChevronRight size={20} /></a>{:else}<span class="w-9"></span>{/if}
	</nav>
</div>

<section class="summary panel mt-4 grid gap-3 p-5" aria-label="Summary">
	<div class="flex items-end justify-between gap-3">
		<div>
			<p class="text-sm font-bold text-ink-soft">Collected</p>
			<p class="tnum text-[2rem] leading-tight font-extrabold">{rupees(f.collectedPaise)}</p>
		</div>
		<p class="text-right text-ink-soft">of <strong class="tnum text-ink">{rupees(f.totalPaise)}</strong></p>
	</div>
	<div class="bar" role="progressbar" aria-valuenow={share} aria-valuemin={0} aria-valuemax={100} aria-label="{share}% collected">
		<span style:width="{share}%"></span>
	</div>
	{#if f.unpaidCount > 0}
		<p class="flex items-center gap-2 font-semibold text-due"><CircleAlert size={18} aria-hidden="true" /> {rupees(f.duePaise)} still due from {f.unpaidCount} {f.unpaidCount === 1 ? 'student' : 'students'}</p>
	{:else if f.rows.length}
		<p class="flex items-center gap-2 font-semibold text-present"><Check size={18} aria-hidden="true" /> Everyone has paid for {f.label}</p>
	{/if}
</section>

{#if form && 'message' in form}<p class="mt-3 font-semibold text-present" role="status">{form.message}</p>{/if}
{#if form && 'error' in form}<p class="error-text mt-3" role="alert">{form.error}</p>{/if}

{#if f.rows.length === 0}
	<div class="panel mt-5 grid justify-items-center gap-2 p-8 text-center">
		<span class="text-5xl" aria-hidden="true">🧾</span>
		<p class="text-lg font-bold">No fees for {f.label}</p>
		<p class="max-w-[32ch] text-ink-soft">Fees appear here when a batch has a monthly fee and students are added.</p>
	</div>
{:else}
	<div class="seg mt-5" role="tablist" aria-label="Show">
		<button role="tab" aria-selected={show === 'due'} onclick={() => (show = 'due')}>Not paid ({f.unpaidCount})</button>
		<button role="tab" aria-selected={show === 'paid'} onclick={() => (show = 'paid')}>Paid</button>
		<button role="tab" aria-selected={show === 'all'} onclick={() => (show = 'all')}>All</button>
	</div>

	<ul class="mt-3 grid gap-2">
		{#each rows as r (r.invoice_id)}
			{@const wa = reminder(r)}
			<li class="row panel" data-status={r.status}>
				<div class="flex items-center gap-3">
					<span class="avatar" aria-hidden="true">{initials(r.display_name)}</span>
					<div class="min-w-0 flex-1">
						<p class="truncate font-bold">{r.display_name}</p>
						<p class="truncate text-sm text-ink-soft">{r.batch_name ?? ''}</p>
					</div>
					<div class="text-right">
						<p class="tnum font-extrabold">{rupees(r.amount_paise)}</p>
						{#if r.status === 'paid'}
							<p class="tag good"><Check size={13} aria-hidden="true" /> Paid {r.paid_on ? shortDate(r.paid_on) : ''}{r.method ? `, ${methodLabel[r.method]}` : ''}</p>
						{:else if r.status === 'waived'}
							<p class="tag">Waived</p>
						{:else if r.overdue}
							<p class="tag bad">Late, due {shortDate(r.due_on)}</p>
						{:else}
							<p class="tag warn">Due {shortDate(r.due_on)}</p>
						{/if}
					</div>
				</div>

				{#if r.claim_id && r.status === 'due'}
					<div class="claim">
						<p class="font-semibold"><Smartphone size={16} class="inline" aria-hidden="true" /> Says they paid{r.claim_reference ? ` (UPI ref ${r.claim_reference})` : ''}. Check your UPI app.</p>
						<div class="flex gap-2">
							<form method="POST" action="?/pay" use:enhance={keep}>
								<input type="hidden" name="invoice" value={r.invoice_id} /><input type="hidden" name="method" value="upi" />
								<input type="hidden" name="reference" value={r.claim_reference ?? ''} />
								<button class="btn btn-primary min-h-10 px-3 text-sm"><Check size={16} aria-hidden="true" /> Yes, received</button>
							</form>
							<form method="POST" action="?/reject" use:enhance={keep}>
								<input type="hidden" name="claim" value={r.claim_id} />
								<button class="btn btn-quiet min-h-10 px-3 text-sm">Not received</button>
							</form>
						</div>
					</div>
				{/if}

				{#if r.status === 'due'}
					{#if open === r.invoice_id}
						<form method="POST" action="?/pay" class="grid gap-2 border-t border-dashed border-line pt-3" use:enhance={keep}>
							<input type="hidden" name="invoice" value={r.invoice_id} />
							<p class="text-sm font-bold">How did they pay?</p>
							<div class="grid grid-cols-3 gap-2">
								<button class="btn btn-quiet min-h-11 px-2" name="method" value="cash"><Banknote size={18} aria-hidden="true" /> Cash</button>
								<button class="btn btn-quiet min-h-11 px-2" name="method" value="upi"><Smartphone size={18} aria-hidden="true" /> UPI</button>
								<button class="btn btn-quiet min-h-11 px-2" name="method" value="other">Other</button>
							</div>
							<button type="button" class="text-sm text-ink-soft underline" onclick={() => (open = null)}>Cancel</button>
						</form>
					{:else}
						<div class="flex flex-wrap gap-2">
							<button class="btn btn-primary min-h-10 flex-1 px-3 text-sm" onclick={() => (open = r.invoice_id)}><Check size={16} aria-hidden="true" /> Mark paid</button>
							{#if wa}
								<a class="btn btn-whatsapp min-h-10 px-3 text-sm" href={wa} target="_blank" rel="noopener"><MessageCircle size={16} aria-hidden="true" /> Remind</a>
							{/if}
							<form method="POST" action="?/waive" use:enhance={keep}>
								<input type="hidden" name="invoice" value={r.invoice_id} /><input type="hidden" name="on" value="1" />
								<button class="btn btn-quiet min-h-10 px-3 text-sm" title="No fee this month">Waive</button>
							</form>
						</div>
					{/if}
				{:else if r.status === 'paid'}
					<form method="POST" action="?/undo" use:enhance={keep}>
						<input type="hidden" name="invoice" value={r.invoice_id} />
						<button class="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft"><Undo2 size={15} aria-hidden="true" /> Mark as not paid</button>
					</form>
				{:else if r.status === 'waived'}
					<form method="POST" action="?/waive" use:enhance={keep}>
						<input type="hidden" name="invoice" value={r.invoice_id} /><input type="hidden" name="on" value="0" />
						<button class="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft"><Undo2 size={15} aria-hidden="true" /> Make due again</button>
					</form>
				{/if}
			</li>
		{:else}
			<li class="panel p-6 text-center text-ink-soft">{show === 'due' ? 'Nobody owes fees this month.' : 'Nothing here yet.'}</li>
		{/each}
	</ul>
{/if}

<section class="panel mt-6 p-4">
	{#if data.qr}
		<button class="flex w-full items-center justify-between gap-2 font-bold" onclick={() => (showQr = !showQr)} aria-expanded={showQr}>
			<span class="flex items-center gap-2"><QrCode size={20} aria-hidden="true" /> Show my UPI QR for students</span>
			<ChevronRight size={18} class={showQr ? 'rotate-90 transition' : 'transition'} aria-hidden="true" />
		</button>
		{#if showQr}
			<div class="mt-4 grid justify-items-center gap-2">
				<div class="qr">{@html data.qr}</div>
				<p class="font-semibold">{data.org.upi_id}</p>
				<p class="text-sm text-ink-soft">Students scan this with GPay, PhonePe or Paytm. Money comes straight to you.</p>
			</div>
		{/if}
	{:else}
		<p class="flex items-center gap-2 text-ink-soft"><QrCode size={20} aria-hidden="true" /> Add your UPI ID in <a class="font-semibold text-indigo underline" href="/app/c/{data.org.id}/more">More</a> to show a payment QR.</p>
	{/if}
</section>

<style>
	.month {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		border-radius: 999px;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
		font-weight: 700;
	}
	.month a {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		color: var(--color-ink);
	}
	.month a:hover {
		background: var(--color-indigo-soft);
	}
	.bar {
		height: 12px;
		border-radius: 999px;
		background: var(--color-line);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #0f9d58, #2bc4a0);
		transition: width 500ms ease;
	}
	.seg {
		display: flex;
		padding: 0.25rem;
		border-radius: 999px;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
	}
	.seg button {
		flex: 1;
		padding: 0.5rem 0.5rem;
		border-radius: 999px;
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--color-ink-soft);
	}
	.seg button[aria-selected='true'] {
		background: var(--color-indigo-soft);
		color: var(--color-indigo-deep);
	}
	.row {
		display: grid;
		gap: 0.75rem;
		padding: 0.9rem;
		border-radius: 16px;
	}
	.avatar {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 999px;
		background: var(--color-indigo-soft);
		color: var(--color-indigo-deep);
		font-weight: 800;
		font-size: 0.9rem;
	}
	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		margin-top: 0.15rem;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
		background: var(--color-line);
		color: var(--color-ink-soft);
		white-space: nowrap;
	}
	.tag.good {
		background: var(--color-present-soft);
		color: var(--color-present);
	}
	.tag.warn {
		background: var(--color-due-soft);
		color: var(--color-due);
	}
	.tag.bad {
		background: var(--color-absent-soft);
		color: var(--color-absent);
	}
	.claim {
		display: grid;
		gap: 0.5rem;
		padding: 0.75rem;
		border-radius: 12px;
		background: var(--color-haldi-soft);
	}
	.qr {
		width: 13rem;
		padding: 0.5rem;
		border-radius: 16px;
		background: white;
	}
	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
</style>

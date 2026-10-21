<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Hourglass from '@lucide/svelte/icons/hourglass';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import { initials } from '#lib/format.ts';
	import { formatPhone } from '#lib/phone.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let who = $state<'adult' | 'child'>('child');
	let open = $state(untrack(() => data.students.length === 0));
	let busy = $state(false);
	const canAdd = $derived(data.org.role !== 'instructor');
	const values = $derived((form && 'values' in form ? form.values : {}) as Record<string, string>);

	function parentMessage(child: string, phone: string) {
		const text = `Hello, ${data.org.name} added ${child} as a student on MastersCorner. Please sign in with this number (${formatPhone(phone)}) to confirm: ${data.origin}/login?next=/app`;
		return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(text)}`;
	}

	const groups = $derived(
		data.org.batches.map((b) => ({ ...b, students: data.students.filter((s) => s.batch_id === b.id) }))
	);
</script>

<svelte:head><title>Students | {data.org.name}</title></svelte:head>

<div class="flex items-center justify-between gap-3">
	<h1 class="text-[1.6rem]">Students <span class="text-ink-soft">({data.students.length})</span></h1>
	{#if canAdd && !open}
		<button class="btn btn-primary" onclick={() => (open = true)}><UserPlus size={20} aria-hidden="true" /> Add</button>
	{/if}
</div>

{#if form && 'added' in form && form.added}
	<div class="panel mt-4 grid gap-3 border-2 border-present p-4" role="status">
		<p class="font-semibold text-present">{form.added.name} added.</p>
		{#if form.added.isChild && form.added.guardianPhone}
			<p>Ask the parent to confirm. Until then, {form.added.name} is "waiting for parent".</p>
			<a class="btn btn-whatsapp w-fit" href={parentMessage(form.added.name, form.added.guardianPhone)} target="_blank" rel="noopener">
				<MessageCircle size={20} aria-hidden="true" /> Send to parent on WhatsApp
			</a>
		{/if}
	</div>
{/if}

{#if canAdd && open}
	<form
		method="POST"
		action="?/add"
		class="panel mt-4 grid gap-4 p-4"
		use:enhance={() => {
			busy = true;
			return async ({ update, result, formElement }) => {
				await update({ reset: false });
				busy = false;
				if (result.type === 'success') {
					// Clear the typed details but keep the child/adult choice and batch for the next student.
					for (const name of ['name', 'phone', 'guardian_phone']) {
						const input = formElement.elements.namedItem(name);
						if (input instanceof HTMLInputElement) input.value = '';
					}
					(formElement.elements.namedItem('name') as HTMLInputElement | null)?.focus();
				}
			};
		}}
	>
		<div class="field">
			<span>Who are you adding?</span>
			<div class="flex gap-2">
				<label class="chip"><input type="radio" name="who" value="child" bind:group={who} /> A child (under 18)</label>
				<label class="chip"><input type="radio" name="who" value="adult" bind:group={who} /> An adult</label>
			</div>
		</div>
		<label class="field"><span>Student name</span><input class="input" name="name" required maxlength="80" defaultValue={values.name ?? ''} autocomplete="off" /></label>
		{#if who === 'child'}
			<label class="field">
				<span>Parent's mobile number</span>
				<input class="input" name="guardian_phone" inputmode="tel" required defaultValue={values.guardian_phone ?? ''} placeholder="98765 43210" />
				<small>The parent must confirm before the child's attendance is saved. This is required by law for children.</small>
			</label>
		{:else}
			<label class="field">
				<span>Mobile number (optional)</span>
				<input class="input" name="phone" inputmode="tel" defaultValue={values.phone ?? ''} placeholder="98765 43210" />
				<small>If they sign in with this number, they see their attendance and fees.</small>
			</label>
		{/if}
		<label class="field">
			<span>Batch</span>
			<select class="input" name="batch_id" required>
				{#each data.org.batches as b (b.id)}
					<option value={b.id} selected={values.batch_id === b.id}>{b.name}</option>
				{/each}
			</select>
		</label>
		{#if form && 'error' in form}<p class="error-text" role="alert">{form.error}</p>{/if}
		<div class="flex gap-2">
			<button class="btn btn-primary flex-1" disabled={busy}>{busy ? 'Adding…' : 'Add student'}</button>
			{#if data.students.length > 0}<button type="button" class="btn btn-quiet" onclick={() => (open = false)}>Close</button>{/if}
		</div>
	</form>
{/if}

{#if data.students.length === 0 && !canAdd}
	<p class="panel mt-4 p-5 text-ink-soft">No students yet.</p>
{/if}

{#each groups as g (g.id)}
	{#if g.students.length}
		<section class="mt-6">
			<h2 class="text-lg">{g.name} <span class="font-normal text-ink-soft">({g.students.length})</span></h2>
			<ul class="mt-2 grid gap-2">
				{#each g.students as s (s.enrolment_id)}
					<li class="panel flex items-center gap-3 p-3">
						<span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-soft font-bold text-indigo-deep" aria-hidden="true">{initials(s.display_name)}</span>
						<span class="grid min-w-0 flex-1">
							<strong class="truncate">{s.display_name}</strong>
							{#if s.status === 'pending_consent'}
								<small class="flex items-center gap-1 font-semibold text-due"><Hourglass size={14} aria-hidden="true" /> Waiting for parent</small>
							{:else if s.is_minor}
								<small class="text-ink-soft">Child, parent confirmed</small>
							{:else if s.phone_e164}
								<small class="text-ink-soft">{formatPhone(s.phone_e164)}</small>
							{/if}
						</span>
						{#if s.status === 'pending_consent' && s.guardian_phone}
							<a class="btn btn-quiet min-h-10 px-3 text-sm" href={parentMessage(s.display_name, s.guardian_phone)} target="_blank" rel="noopener" aria-label="Remind parent of {s.display_name} on WhatsApp">
								<MessageCircle size={18} aria-hidden="true" /> Remind
							</a>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/each}

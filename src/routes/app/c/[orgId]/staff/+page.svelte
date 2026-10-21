<script lang="ts">
	import { enhance } from '$app/forms';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import BackLink from '#lib/components/BackLink.svelte';
	import { initials } from '#lib/format.ts';
	import { formatPhone } from '#lib/phone.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let role = $state<'instructor' | 'admin'>('instructor');
	const roleLabel: Record<string, string> = { owner: 'Owner', admin: 'Admin', instructor: 'Teacher' };

	function inviteLink(phone: string, r: string) {
		const text = `Hello, ${data.org.name} added you as ${r === 'admin' ? 'an admin' : 'a teacher'} on MastersCorner. Sign in with this number (${formatPhone(phone)}) to join: ${data.origin}/login?next=/app`;
		return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(text)}`;
	}
</script>

<svelte:head><title>Staff | {data.org.name}</title></svelte:head>

<BackLink href="/app/c/{data.org.id}/more" label="More" />
<h1 class="text-[1.8rem]">Staff</h1>
<p class="mt-1 text-ink-soft">Teachers mark attendance and see students. Admins can also manage fees, students and settings.</p>

{#if form && 'message' in form}<p class="mt-3 rounded-xl bg-present-soft p-3 font-semibold text-present" role="status">{form.message}</p>{/if}
{#if form && 'error' in form}<p class="error-text mt-3" role="alert">{form.error}</p>{/if}
{#if form && 'invited' in form && form.invited}
	<a class="btn btn-whatsapp mt-3" href={inviteLink(form.invited.phone, form.invited.role)} target="_blank" rel="noopener"><MessageCircle size={18} aria-hidden="true" /> Send invitation on WhatsApp</a>
{/if}

<ul class="mt-5 grid gap-2">
	{#each data.staff.members as m (m.person_id)}
		<li class="panel flex items-center gap-3 p-3">
			<span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-soft font-extrabold text-indigo-deep" aria-hidden="true">{initials(m.display_name)}</span>
			<span class="grid min-w-0 flex-1">
				<strong class="truncate">{m.display_name}{m.person_id === data.myId ? ' (you)' : ''}</strong>
				<small class="flex items-center gap-1 text-ink-soft">{#if m.role !== 'instructor'}<ShieldCheck size={13} aria-hidden="true" />{/if}{roleLabel[m.role]}</small>
			</span>
			{#if m.role !== 'owner' && m.person_id !== data.myId}
				<form method="POST" action="?/remove" use:enhance>
					<input type="hidden" name="person" value={m.person_id} />
					<button class="text-sm font-semibold text-absent">Remove</button>
				</form>
			{/if}
		</li>
	{/each}
</ul>

{#if data.staff.invites.length}
	<h2 class="mt-6 text-lg">Waiting to join</h2>
	<ul class="mt-2 grid gap-2">
		{#each data.staff.invites as i (i.id)}
			<li class="panel flex items-center gap-3 p-3">
				<span class="grid flex-1"><strong>{formatPhone(i.phone_e164)}</strong><small class="text-ink-soft">{roleLabel[i.role]}</small></span>
				<a class="btn btn-quiet min-h-9 px-2 text-xs" href={inviteLink(i.phone_e164, i.role)} target="_blank" rel="noopener"><MessageCircle size={14} aria-hidden="true" /> Send</a>
				<form method="POST" action="?/cancel" use:enhance><input type="hidden" name="id" value={i.id} /><button class="text-sm font-semibold text-ink-soft">Cancel</button></form>
			</li>
		{/each}
	</ul>
{/if}

<form method="POST" action="?/invite" class="panel mt-6 grid gap-4 p-5" use:enhance={() => async ({ update }) => update({ reset: true })}>
	<h2 class="flex items-center gap-2 text-lg"><UserPlus size={20} aria-hidden="true" /> Add staff</h2>
	<label class="field"><span>Mobile number</span><input class="input" name="phone" inputmode="tel" required placeholder="98765 43210" /></label>
	<div class="field">
		<span>Role</span>
		<div class="flex gap-2">
			<label class="chip"><input type="radio" name="role" value="instructor" bind:group={role} /> Teacher</label>
			<label class="chip"><input type="radio" name="role" value="admin" bind:group={role} /> Admin</label>
		</div>
	</div>
	<button class="btn btn-primary">Create invitation</button>
</form>

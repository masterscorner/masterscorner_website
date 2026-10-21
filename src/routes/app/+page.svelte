<script lang="ts">
	import Baby from '@lucide/svelte/icons/baby';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import X from '@lucide/svelte/icons/x';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import { initials } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const roleLabel = { owner: 'Owner', admin: 'Admin', instructor: 'Teacher' } as const;
	const first = $derived(data.me.display_name.split(' ')[0]);
</script>

<svelte:head><title>My page | MastersCorner</title></svelte:head>

<div class="hero-bg pb-20">
	<SiteHeader onHero signedIn />
	<div class="mx-auto flex max-w-2xl items-center gap-4 px-4 pt-2">
		<span class="avatar" aria-hidden="true">{initials(data.me.display_name)}</span>
		<div>
			<h1 class="text-[1.8rem]">Hello, {first}</h1>
			<p class="text-white/75">What would you like to do today?</p>
		</div>
	</div>
</div>

<main class="relative z-10 mx-auto -mt-12 grid max-w-2xl gap-8 px-4 pb-16">
	{#if data.pending.length}
		<section aria-labelledby="pending" class="grid gap-3">
			{#each data.pending as p (p.guardianship_id)}
				<div class="panel confirm grid gap-3 p-5">
					<p id="pending" class="flex items-center gap-2 font-extrabold text-indigo-deep"><Baby size={22} aria-hidden="true" /> Please confirm your child</p>
					<p><strong>{p.class_name}</strong> added <strong>{p.child_name}</strong> as a student and gave your number as the parent.</p>
					<p class="text-sm text-ink-soft">If you confirm, the class can keep {p.child_name}'s attendance, fees and progress here. You can see all of it and remove it any time. Not your child? Tap "Not my child" and the record is deleted.</p>
					<div class="flex flex-wrap gap-2">
						<form method="POST" action="?/confirm"><input type="hidden" name="id" value={p.guardianship_id} /><button class="btn btn-primary"><Check size={20} aria-hidden="true" /> Yes, confirm</button></form>
						<form method="POST" action="?/decline"><input type="hidden" name="id" value={p.guardianship_id} /><button class="btn btn-quiet"><X size={20} aria-hidden="true" /> Not my child</button></form>
					</div>
				</div>
			{/each}
		</section>
	{/if}
	{#if form?.error}<p class="error-text" role="alert">{form.error}</p>{/if}
	{#if form?.done === 'confirmed'}<p class="panel p-4 font-bold text-present" role="status">Thank you. Your child is confirmed.</p>{/if}

	{#each data.invites as inv (inv.id)}
		<div class="panel confirm grid gap-3 p-5">
			<p class="flex items-center gap-2 font-extrabold text-indigo-deep"><UserPlus size={22} aria-hidden="true" /> Join as {inv.role === 'admin' ? 'admin' : 'teacher'}</p>
			<p><strong>{inv.org_name}</strong> invited you to help run their class.</p>
			<form method="POST" action="?/join"><input type="hidden" name="id" value={inv.id} /><button class="btn btn-primary"><Check size={20} aria-hidden="true" /> Join {inv.org_name}</button></form>
		</div>
	{/each}

	{#if data.learning.length}
		<section aria-labelledby="learn" class="grid gap-3">
			<h2 id="learn" class="text-xl">{data.learning.some((l) => !l.is_me) ? 'Classes (me and my children)' : 'My classes'}</h2>
			<ul class="grid gap-3">
				{#each data.learning as l (l.person_id + l.org_id)}
					<li>
						<a href="/app/learn/{l.org_id}/{l.person_id}" class="panel row">
							<span class="logo learn" aria-hidden="true">{initials(l.org_name)}</span>
							<span class="grid min-w-0 flex-1">
								<strong class="truncate">{l.org_name}</strong>
								<small class="text-ink-soft">{l.is_me ? l.batch_name : `${l.person_name}, ${l.batch_name}`}</small>
							</span>
							{#if l.due_count > 0}<span class="rounded-full bg-due-soft px-2.5 py-1 text-xs font-extrabold text-due">Fees due</span>{/if}
							<ChevronRight size={22} class="text-ink-soft" aria-hidden="true" />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section aria-labelledby="teach" class="grid gap-3">
		{#if data.classes.length === 0}
			<div class="panel grid gap-4 p-5">
				<div>
					<h2 id="teach" class="text-xl">Do you teach?</h2>
					<p class="mt-1 text-ink-soft">Add your class in 3 minutes. Attendance, students and fees, all free.</p>
				</div>
				<a href="/app/start" class="btn btn-primary w-fit"><Plus size={20} aria-hidden="true" /> Start my class</a>
			</div>
		{:else}
			<h2 id="teach" class="text-xl {data.pending.length ? '' : 'sr-only'}">Classes I run</h2>
			<ul class="grid gap-3">
				{#each data.classes as c (c.id)}
					<li>
						<a href="/app/c/{c.id}" class="panel row">
							<span class="logo" aria-hidden="true">{initials(c.name)}</span>
							<span class="grid min-w-0 flex-1">
								<strong class="truncate text-[1.05rem]">{c.name}</strong>
								<small class="text-ink-soft">{roleLabel[c.role]}</small>
							</span>
							<ChevronRight size={22} class="text-ink-soft" aria-hidden="true" />
						</a>
					</li>
				{/each}
			</ul>
			<a href="/app/start" class="btn btn-quiet w-fit"><Plus size={20} aria-hidden="true" /> Add another class</a>
		{/if}
	</section>

	{#if data.children.length}
		<section aria-labelledby="kids" class="grid gap-3">
			<h2 id="kids" class="text-xl">My children</h2>
			<ul class="grid gap-3 sm:grid-cols-2">
				{#each data.children as c (c.id)}
					<li class="panel row"><span class="logo kid" aria-hidden="true">{initials(c.display_name)}</span><strong>{c.display_name}</strong></li>
				{/each}
			</ul>
		</section>
	{/if}

	<a href="/search" class="panel row">
		<span class="logo find" aria-hidden="true"><Search size={22} /></span>
		<span class="grid flex-1"><strong>Find a class</strong><small class="text-ink-soft">Classes near you, with reviews</small></span>
		<ChevronRight size={22} class="text-ink-soft" aria-hidden="true" />
	</a>

	<form method="POST" action="/logout" onsubmit={() => navigator.serviceWorker?.controller?.postMessage('clear-pages')}>
		<button class="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft"><LogOut size={16} aria-hidden="true" /> Sign out</button>
	</form>
</main>

<style>
	.avatar {
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 999px;
		background: var(--color-haldi);
		color: #10294a;
		font-weight: 800;
		font-size: 1.2rem;
		box-shadow: 0 0 0 4px rgb(255 255 255 / 0.15);
	}
	.confirm {
		border: 2px solid var(--color-haldi);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 1rem;
		color: var(--color-ink);
		text-decoration: none;
		transition: transform 140ms ease;
	}
	a.row:active {
		transform: scale(0.985);
	}
	.logo {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 3rem;
		height: 3rem;
		border-radius: 14px;
		color: white;
		font-weight: 800;
		background: linear-gradient(135deg, #f26b1d, #c2470b);
	}
	.logo.kid {
		background: linear-gradient(135deg, #ff8a3d, #ffb703);
	}
	.logo.learn {
		background: linear-gradient(135deg, #0f9d58, #6fcf52);
	}
	.logo.find {
		background: linear-gradient(135deg, #0ea5e9, #6366f1);
	}
</style>

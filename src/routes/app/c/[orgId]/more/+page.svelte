<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Copy from '@lucide/svelte/icons/copy';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Images from '@lucide/svelte/icons/images';
	import Inbox from '@lucide/svelte/icons/inbox';
	import LogOut from '@lucide/svelte/icons/log-out';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Settings from '@lucide/svelte/icons/settings';
	import Star from '@lucide/svelte/icons/star';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const base = $derived(`/app/c/${data.org.id}`);
	const manager = $derived(data.org.role !== 'instructor');
	const link = $derived(`${data.origin}/c/${data.org.slug}`);
	let copied = $state(false);
	const share = $derived(`https://wa.me/?text=${encodeURIComponent(`See our class timings, fees and reviews: ${link}`)}`);

	const tiles = $derived([
		...(manager
			? [
					{ href: 'enquiries', label: 'Enquiries', note: 'Questions from your page', icon: Inbox, badge: data.newEnquiries },
					{ href: 'reviews', label: 'Reviews', note: 'Read and reply', icon: Star, badge: 0 }
				]
			: []),
		{ href: 'levels', label: 'Levels', note: 'Belts and gradings', icon: Award, badge: 0 },
		...(manager
			? [
					{ href: 'batches', label: 'Batches and fees', note: 'Days, times, monthly fee', icon: CalendarClock, badge: 0 },
					{ href: 'photos', label: 'Photos', note: 'Up to 5 for your page', icon: Images, badge: 0 },
					{ href: 'settings', label: 'Class details', note: 'Name, address, contact', icon: Settings, badge: 0 },
					{ href: 'staff', label: 'Teachers and staff', note: 'Invite by phone', icon: UserPlus, badge: 0 }
				]
			: [])
	]);

	async function copy() {
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head><title>More | {data.org.name}</title></svelte:head>

<h1 class="text-[1.6rem]">More</h1>

<ul class="mt-4 grid gap-2 sm:grid-cols-2">
	{#each tiles as t (t.href)}
		<li>
			<a class="hub" href="{base}/{t.href}">
				<span class="ico"><t.icon size={20} aria-hidden="true" /></span>
				<span class="grid min-w-0 flex-1">
					<strong>{t.label}</strong>
					<small class="truncate text-ink-soft">{t.note}</small>
				</span>
				{#if t.badge}<span class="badge" aria-label="{t.badge} new">{t.badge}</span>{/if}
				<ChevronRight size={18} class="text-ink-soft" aria-hidden="true" />
			</a>
		</li>
	{/each}
</ul>

<section class="panel mt-6 grid gap-3 p-4">
	<h2 class="text-lg">Your public page</h2>
	<p class="break-all text-ink-soft">{link}</p>
	<div class="flex flex-wrap gap-2">
		<a class="btn btn-whatsapp" href={share} target="_blank" rel="noopener"><MessageCircle size={20} aria-hidden="true" /> Share on WhatsApp</a>
		<button class="btn btn-quiet" onclick={copy}><Copy size={20} aria-hidden="true" /> {copied ? 'Copied' : 'Copy link'}</button>
		<a class="btn btn-quiet" href="/c/{data.org.slug}" target="_blank"><ExternalLink size={20} aria-hidden="true" /> Open</a>
	</div>
</section>

<form method="POST" action="/logout" onsubmit={() => navigator.serviceWorker?.controller?.postMessage('clear-pages')} class="mt-6">
	<button class="btn btn-quiet"><LogOut size={20} aria-hidden="true" /> Sign out</button>
</form>

<style>
	.hub {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		min-height: 4rem;
		padding: 0.7rem 0.9rem;
		border-radius: 16px;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
		color: inherit;
		text-decoration: none;
		transition: border-color 0.15s;
	}
	.hub:hover {
		border-color: var(--color-indigo);
	}
	.ico {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 12px;
		background: var(--color-indigo-soft);
		color: var(--color-indigo);
	}
	.badge {
		min-width: 1.5rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: var(--color-haldi);
		color: #1d1a00;
		font-size: 0.78rem;
		font-weight: 800;
		text-align: center;
	}
</style>

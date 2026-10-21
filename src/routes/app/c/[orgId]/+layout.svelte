<script lang="ts">
	import { page } from '$app/state';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import House from '@lucide/svelte/icons/house';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import IndianRupee from '@lucide/svelte/icons/indian-rupee';
	import Users from '@lucide/svelte/icons/users';
	import { initials } from '#lib/format.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const base = $derived(`/app/c/${data.org.id}`);
	const roleLabel = { owner: 'Owner', admin: 'Admin', instructor: 'Teacher' } as const;
	const tabs = $derived([
		{ href: base, label: 'Today', icon: CalendarCheck, match: (p: string) => p === base || p.startsWith(`${base}/attendance`) },
		{ href: `${base}/students`, label: 'Students', icon: Users, match: (p: string) => p.startsWith(`${base}/students`) },
		...(data.org.role === 'instructor'
			? []
			: [{ href: `${base}/fees`, label: 'Fees', icon: IndianRupee, match: (p: string) => p.startsWith(`${base}/fees`) }]),
		{ href: `${base}/insights`, label: 'Insights', icon: ChartLine, match: (p: string) => p.startsWith(`${base}/insights`) },
		{ href: `${base}/more`, label: 'More', icon: Ellipsis, match: (p: string) => /^\/(more|settings|batches|photos|staff|enquiries|reviews|levels)/.test(p.slice(base.length)) }
	]);
</script>

<div class="min-h-dvh pb-24 lg:pb-0 lg:pl-60">
	<header class="top">
		<div class="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5">
			<a href="/app" class="back" aria-label="My page" title="My page"><House size={21} /></a>
			<span class="org" aria-hidden="true">{initials(data.org.name)}</span>
			<span class="grid min-w-0">
				<strong class="truncate text-[1.05rem] leading-tight text-indigo-deep">{data.org.name}</strong>
				<small class="text-ink-soft">{roleLabel[data.org.role]}</small>
			</span>
		</div>
	</header>

	<div class="mx-auto max-w-3xl px-4 pt-5">
		{@render children()}
	</div>

	<nav class="tabs" aria-label="Class menu">
		{#each tabs as t (t.href)}
			{@const active = t.match(page.url.pathname)}
			<a href={t.href} aria-current={active ? 'page' : undefined}>
				<span class="icon"><t.icon size={22} aria-hidden="true" /></span>
				<span>{t.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.top {
		position: sticky;
		top: 0;
		z-index: 20;
		background: color-mix(in oklab, var(--color-chalk) 82%, transparent);
		backdrop-filter: saturate(1.6) blur(14px);
		-webkit-backdrop-filter: saturate(1.6) blur(14px);
		border-bottom: 1px solid var(--color-line);
	}
	.back {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 999px;
		color: var(--color-ink);
	}
	.back:hover {
		background: var(--color-line);
	}
	.org {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 12px;
		background: linear-gradient(135deg, #f26b1d, #c2470b);
		color: white;
		font-weight: 800;
		font-size: 0.9rem;
	}
	.tabs {
		position: fixed;
		inset: auto 0 0 0;
		display: flex;
		background: color-mix(in oklab, var(--color-surface) 92%, transparent);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-top: 1px solid var(--color-line);
		padding: 0.35rem 0.25rem calc(0.35rem + env(safe-area-inset-bottom));
		z-index: 20;
	}
	.tabs a {
		flex: 1;
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 0.2rem 0;
		color: var(--color-ink-soft);
		text-decoration: none;
		font-size: 0.78rem;
		font-weight: 700;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 2rem;
		border-radius: 999px;
		transition:
			background-color 200ms ease,
			transform 200ms var(--ease-spring);
	}
	.tabs a[aria-current='page'] {
		color: var(--color-indigo-deep);
	}
	.tabs a[aria-current='page'] .icon {
		background: var(--color-indigo-soft);
		transform: scale(1.04);
	}
	@media (min-width: 1024px) {
		.tabs {
			inset: 0 auto 0 0;
			width: 15rem;
			flex-direction: column;
			gap: 0.25rem;
			border-top: 0;
			border-right: 1px solid var(--color-line);
			padding: 5rem 0.75rem 1rem;
		}
		.tabs a {
			flex: none;
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.4rem;
			border-radius: 14px;
			font-size: 1rem;
		}
		.tabs a[aria-current='page'] {
			background: var(--color-indigo-soft);
		}
		.tabs a[aria-current='page'] .icon {
			background: transparent;
		}
	}
</style>

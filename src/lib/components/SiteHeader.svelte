<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import UserRound from '@lucide/svelte/icons/user-round';
	import { page } from '$app/state';
	import Logo from './Logo.svelte';

	// onHero is accepted for older pages; the bar looks the same everywhere now.
	let props: { signedIn?: boolean; onHero?: boolean } = $props();
	const signedIn = $derived(props.signedIn || Boolean((page.data as { headerSignedIn?: boolean }).headerSignedIn));
	const city = $derived((page.data as { headerCity?: string }).headerCity ?? '');
	const path = $derived(page.url.pathname);
	const links = [
		{ href: '/', label: 'Explore', match: (p: string) => p === '/' },
		{ href: '/search', label: 'Find a class', match: (p: string) => p.startsWith('/search') || p.startsWith('/c/') },
		{ href: '/teach', label: 'For masters', match: (p: string) => p.startsWith('/teach') }
	];
</script>

<header class="bar">
	<div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
		<a href="/" class="brand" aria-label="MastersCorner home">
			<Logo />
			<span class="grid leading-none">
				<span class="wordmark">Masters<span class="text-[#f37a2b]">Corner</span></span>
				<span class="tagline">Real people. Real learning. Near you.</span>
			</span>
		</a>

		<nav class="ml-6 hidden gap-1 md:flex" aria-label="Main">
			{#each links as l (l.href)}
				<a href={l.href} class="nav" aria-current={l.match(path) ? 'page' : undefined}>{l.label}</a>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-2">
			<a href="/?place=1#find" class="city" aria-label={city ? `Your city: ${city}. Change` : 'Choose your city'}>
				<MapPin size={16} aria-hidden="true" />
				<span class="city-name truncate">{city || 'City'}</span>
				<ChevronDown size={15} aria-hidden="true" class="hidden sm:block" />
			</a>
			{#if !(path === '/login' || (signedIn && path === '/app'))}
				<a href={signedIn ? '/app' : path === '/' ? '/login' : `/login?next=${encodeURIComponent(path + page.url.search)}`} class="account">
					<UserRound size={17} aria-hidden="true" class="sm:hidden" />
					<span class="hidden sm:inline">{signedIn ? 'My page' : 'Login'}</span>
				</a>
			{/if}
		</div>
	</div>
</header>

<style>
	.bar {
		position: sticky;
		top: 0;
		z-index: 30;
		background: #10294a;
		color: white;
		box-shadow: 0 1px 0 rgb(255 255 255 / 0.06);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
		color: white;
		flex-shrink: 0;
	}
	.wordmark {
		font-weight: 800;
		font-size: 1.22rem;
		letter-spacing: -0.03em;
	}
	.tagline {
		margin-top: 0.2rem;
		font-size: 0.66rem;
		font-weight: 600;
		color: rgb(255 255 255 / 0.75);
	}
	@media (max-width: 440px) {
		.brand {
			gap: 0.4rem;
		}
		.brand :global(svg) {
			width: 30px;
			height: 30px;
		}
		.wordmark {
			font-size: 1.02rem;
		}
		.tagline {
			font-size: 0.58rem;
		}
		.city {
			padding: 0 0.55rem;
		}
	}
	@media (max-width: 360px) {
		.tagline {
			display: none;
		}
	}
	.nav {
		position: relative;
		padding: 0.55rem 0.8rem;
		border-radius: 10px;
		font-weight: 650;
		font-size: 0.95rem;
		color: rgb(255 255 255 / 0.85);
		text-decoration: none;
	}
	.nav:hover {
		color: white;
		background: rgb(255 255 255 / 0.07);
	}
	.nav[aria-current='page'] {
		color: white;
	}
	.nav[aria-current='page']::after {
		content: '';
		position: absolute;
		left: 0.8rem;
		right: 0.8rem;
		bottom: 0.15rem;
		height: 3px;
		border-radius: 3px;
		background: #f26b1d;
	}
	.city {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 40px;
		padding: 0 0.75rem;
		border-radius: 12px;
		border: 1px solid rgb(255 255 255 / 0.28);
		color: white;
		font-size: 0.88rem;
		font-weight: 650;
		text-decoration: none;
	}
	.city-name {
		max-width: 4.2rem;
	}
	@media (min-width: 480px) {
		.city-name {
			max-width: 8rem;
		}
	}
	.city:hover {
		border-color: rgb(255 255 255 / 0.55);
	}
	.account {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 40px;
		min-height: 40px;
		padding: 0 1rem;
		border-radius: 12px;
		background: white;
		color: #10294a;
		font-weight: 800;
		font-size: 0.92rem;
		text-decoration: none;
	}
	@media (max-width: 639px) {
		.account {
			padding: 0;
		}
	}
</style>

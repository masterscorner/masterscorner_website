<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import Check from '@lucide/svelte/icons/check';
	import Inbox from '@lucide/svelte/icons/inbox';
	import IndianRupee from '@lucide/svelte/icons/indian-rupee';
	import Award from '@lucide/svelte/icons/award';
	import Globe from '@lucide/svelte/icons/globe';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import PhoneMock from '#lib/components/PhoneMock.svelte';
	import Photo from '#lib/components/Photo.svelte';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const start = $derived(data.signedIn ? '/app/start' : '/login?next=/app/start');
	const tools = [
		{ icon: Globe, title: 'Your own class page', text: 'Photos, timings, fees, address and reviews. Share it on WhatsApp. Found on Google.' },
		{ icon: Inbox, title: 'Enquiries in one place', text: 'Parents ask questions from your page. Call or WhatsApp them in one tap.' },
		{ icon: CalendarCheck, title: 'Attendance in 10 seconds', text: 'Tap present or absent. Works even with no internet.' },
		{ icon: IndianRupee, title: 'Fees made simple', text: 'See who has paid this month. Send a polite WhatsApp reminder.' },
		{ icon: Award, title: 'Belts and levels', text: 'Give the next belt after a grading. Parents see the progress.' },
		{ icon: ChartLine, title: 'Know how your class is doing', text: 'Attendance trends, fees collected, who stopped coming.' }
	];
</script>

<svelte:head>
	<title>For masters and academies | MastersCorner</title>
	<meta name="description" content="List your class free on MastersCorner. Get enquiries from parents near you and run attendance, fees and belts from your phone." />
</svelte:head>

<SiteHeader signedIn={data.signedIn} />

<main>
	<section class="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-8 md:grid-cols-[1.1fr_1fr] md:pt-12">
		<div>
			<p class="badge">For masters and academies</p>
			<h1 class="mt-3 text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.03] tracking-[-0.04em]">Get more students.<br /><span class="text-brand">Run your class from your phone.</span></h1>
			<p class="mt-3 max-w-[40ch] text-[1.08rem] text-ink-soft">Karate, dance, music, yoga, sports or any class. Set up in 2 minutes with your mobile number.</p>
			<ul class="mt-4 grid gap-1.5 font-semibold">
				<li class="flex items-center gap-2"><Check size={18} class="text-present" aria-hidden="true" /> Free for everyone right now</li>
				<li class="flex items-center gap-2"><Check size={18} class="text-present" aria-hidden="true" /> No app to install</li>
				<li class="flex items-center gap-2"><Check size={18} class="text-present" aria-hidden="true" /> Fees go straight to you</li>
			</ul>
			<a href={start} class="btn btn-primary mt-6">List your class free <ArrowRight size={19} aria-hidden="true" /></a>
		</div>
		<div class="hero-photo">
			<Photo key="martial-arts" eager sizes="(min-width: 768px) 520px, 92vw" class="h-full w-full" />
		</div>
	</section>

	<section class="mx-auto mt-12 max-w-6xl px-4" aria-labelledby="steps">
		<h2 id="steps" class="text-[1.5rem]">Start in 3 steps</h2>
		<ol class="mt-4 grid gap-3 sm:grid-cols-3">
			{#each [['Sign in', 'With your mobile number. We send a 6 number code.'], ['Add your class', 'Name, address, timings and fees. Add up to 5 photos.'], ['Share your page', 'Send the link on WhatsApp. Parents can ask you questions.']] as [t, d], i (t)}
				<li class="panel flex gap-3 p-4">
					<span class="num">{i + 1}</span>
					<span><strong class="block text-[1.05rem] text-indigo-deep">{t}</strong><span class="text-ink-soft">{d}</span></span>
				</li>
			{/each}
		</ol>
	</section>

	<section class="mx-auto mt-12 max-w-6xl px-4">
		<div class="hero-bg overflow-hidden rounded-[28px]">
			<div class="grid items-center gap-10 p-6 sm:grid-cols-[1.2fr_1fr] sm:p-10">
				<div>
					<h2 class="text-[1.8rem] sm:text-[2.2rem]">Everything for your class, on your phone.</h2>
					<ul class="mt-6 grid gap-4 sm:grid-cols-2">
						{#each tools as t (t.title)}
							<li class="flex gap-3">
								<span class="ico"><t.icon size={20} aria-hidden="true" /></span>
								<span><strong class="block text-white">{t.title}</strong><span class="text-sm text-white/75">{t.text}</span></span>
							</li>
						{/each}
					</ul>
				</div>
				<PhoneMock />
			</div>
		</div>
	</section>

	<section class="mx-auto mt-12 grid max-w-6xl items-center gap-6 px-4 md:grid-cols-2">
		<div class="side-photo"><Photo key="dance" sizes="(min-width: 768px) 560px, 92vw" class="h-full w-full" /></div>
		<div>
			<h2 class="text-[1.6rem]">Safe and fair for everyone</h2>
			<ul class="mt-3 grid gap-2 text-ink-soft">
				<li><strong class="text-ink">Children are protected.</strong> A parent confirms every child before anything is saved. Children never appear in search.</li>
				<li><strong class="text-ink">Honest reviews.</strong> Only students who came to class can review. You can reply to every review.</li>
				<li><strong class="text-ink">Your contacts, your choice.</strong> Show or hide your phone and email. WhatsApp button only if you want it.</li>
			</ul>
			<a href={start} class="btn btn-primary mt-6">List your class free <ArrowRight size={19} aria-hidden="true" /></a>
		</div>
	</section>
</main>

<SiteFooter />

<style>
	.text-brand {
		color: var(--color-brand);
	}
	.badge {
		display: inline-block;
		padding: 0.3rem 0.85rem;
		border-radius: 999px;
		background: var(--color-indigo-soft);
		color: var(--color-indigo);
		font-weight: 800;
		font-size: 0.85rem;
	}
	.hero-photo,
	.side-photo {
		height: clamp(15rem, 44vw, 24rem);
		border-radius: 28px;
		overflow: hidden;
		box-shadow: var(--shadow-card);
	}
	.num {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 999px;
		background: var(--color-brand);
		color: white;
		font-weight: 800;
	}
	.ico {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 999px;
		background: rgb(242 107 29 / 0.2);
		color: #ffb27a;
	}
</style>

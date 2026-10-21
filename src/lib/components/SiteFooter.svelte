<script lang="ts">
	import Logo from './Logo.svelte';
</script>

<footer class="mt-16 bg-[#10294a] text-white/80">
	<div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-4">
		<div class="sm:col-span-2">
			<p class="flex items-center gap-2 text-lg font-extrabold text-white"><Logo size={30} /> Masters<span class="-ml-2 text-[#f37a2b]">Corner</span></p>
			<p class="mt-2 max-w-[40ch]">Find karate, dance, music, yoga and sports classes near you. Masters run attendance, fees and students for free.</p>
		</div>
		<nav aria-label="Explore" class="grid content-start gap-2">
			<p class="font-bold text-white">Explore</p>
			<a href="/search">Find a class</a>
			<a href="/teach">For masters</a>
			<a href="/login">Login</a>
		</nav>
		<nav aria-label="Help and rules" class="grid content-start gap-2">
			<p class="font-bold text-white">Help</p>
			<a href="/privacy">Privacy</a>
			<a href="/terms">Terms of use</a>
			<a href="/safety">Child safety</a>
			<a href="/grievance">Complaints (Grievance Officer)</a>
			<a href="/report">Report a problem</a>
		</nav>
	</div>
	<p class="mx-auto max-w-6xl border-t border-white/10 px-4 py-4 text-xs text-white/60">Made in India. Photos: <a href="https://www.pexels.com" rel="noopener" class="underline">Pexels</a>.</p>
</footer>

<style>
	a {
		color: inherit;
		text-decoration: none;
	}
	a:hover {
		color: white;
		text-decoration: underline;
	}
</style>

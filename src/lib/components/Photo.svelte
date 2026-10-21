<script lang="ts">
	import { PHOTOS, photoSrcset, photoUrl, type PhotoKey } from '#lib/photos.ts';

	let {
		key,
		sizes = '100vw',
		eager = false,
		decorative = false,
		max = 1600,
		class: klass = ''
	}: { key: PhotoKey; sizes?: string; eager?: boolean; decorative?: boolean; max?: 480 | 960 | 1600; class?: string } = $props();
	const p = $derived(PHOTOS[key]);
</script>

<img
	class={klass}
	src={photoUrl(key, max === 1600 ? 960 : max)}
	srcset={photoSrcset(key, max)}
	{sizes}
	alt={decorative ? '' : p.alt}
	loading={eager ? 'eager' : 'lazy'}
	fetchpriority={eager ? 'high' : 'auto'}
	decoding="async"
	style:object-fit="cover"
	style:object-position={p.focus}
/>

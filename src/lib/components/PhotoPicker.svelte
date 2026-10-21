<script lang="ts">
	// Picks a photo and makes it small on the phone before upload (max 1600 px, WebP), so it uploads fast
	// on slow internet. Without JavaScript the original file is sent instead.
	import Camera from '@lucide/svelte/icons/camera';

	let { name = 'photo', label = 'Choose photo', maxSide = 1600 }: { name?: string; label?: string; maxSide?: number } = $props();
	let input: HTMLInputElement | undefined = $state();
	let preview = $state<string | null>(null);
	let note = $state('');

	async function shrink(file: File): Promise<File> {
		if (!file.type.startsWith('image/')) return file;
		const bitmap = await createImageBitmap(file).catch(() => null);
		if (!bitmap) return file;
		const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.8));
		const out = blob && blob.type === 'image/webp' ? blob : await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
		if (!out || out.size >= file.size) return file;
		return new File([out], file.name.replace(/\.\w+$/, out.type === 'image/webp' ? '.webp' : '.jpg'), { type: out.type });
	}

	async function changed() {
		const file = input?.files?.[0];
		if (!file || !input) return;
		note = 'Preparing photo…';
		const small = await shrink(file);
		const dt = new DataTransfer();
		dt.items.add(small);
		input.files = dt.files;
		if (preview) URL.revokeObjectURL(preview);
		preview = URL.createObjectURL(small);
		note = `Ready: ${Math.round(small.size / 1024)} KB`;
	}
</script>

<label class="picker">
	{#if preview}
		<img src={preview} alt="Chosen" />
	{:else}
		<Camera size={28} aria-hidden="true" />
		<span class="font-bold">{label}</span>
		<small class="text-ink-soft">From camera or gallery</small>
	{/if}
	<input bind:this={input} type="file" {name} accept="image/jpeg,image/png,image/webp" required onchange={changed} />
</label>
{#if note}<p class="text-sm text-ink-soft" role="status">{note}</p>{/if}

<style>
	.picker {
		position: relative;
		display: grid;
		place-items: center;
		gap: 0.25rem;
		min-height: 9rem;
		padding: 1rem;
		border: 2px dashed var(--color-line);
		border-radius: 16px;
		background: var(--color-chalk);
		color: var(--color-indigo);
		text-align: center;
		cursor: pointer;
		overflow: hidden;
	}
	.picker:hover {
		border-color: var(--color-indigo);
	}
	.picker img {
		max-height: 12rem;
		border-radius: 10px;
	}
	input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
</style>

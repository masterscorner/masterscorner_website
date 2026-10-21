<script lang="ts">
	import { enhance } from '$app/forms';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import Star from '@lucide/svelte/icons/star';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import BackLink from '#lib/components/BackLink.svelte';
	import PhotoPicker from '#lib/components/PhotoPicker.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state<string | null>(null);
	let pickerKey = $state(0);
	const full = $derived(data.photos.length >= 5);

	const run = (which: string) => () => {
		busy = which;
		return async ({ update, result }: { update: (o?: { reset?: boolean }) => Promise<void>; result: { type: string } }) => {
			await update({ reset: true });
			busy = null;
			if (result.type === 'success') pickerKey++;
		};
	};
</script>

<svelte:head><title>Photos | {data.org.name}</title></svelte:head>

<BackLink href="/app/c/{data.org.id}/more" label="More" />
<h1 class="text-[1.8rem]">Photos</h1>
<p class="mt-1 text-ink-soft">Up to 5 photos of your class: the place, equipment, trophies, the teacher. Good photos bring more students.</p>

{#if form && 'message' in form}<p class="mt-3 rounded-xl bg-present-soft p-3 font-semibold text-present" role="status">{form.message}</p>{/if}
{#if form && 'error' in form}<p class="error-text mt-3" role="alert">{form.error}</p>{/if}

{#if data.photos.length}
	<ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each data.photos as p (p.id)}
			<li class="panel overflow-hidden">
				<div class="relative">
					<img src="/media/{p.storage_key}" alt={p.alt_text} class="aspect-[4/3] w-full object-cover" loading="lazy" />
					{#if data.coverKey === p.storage_key}<span class="absolute top-2 left-2 rounded-full bg-haldi px-2 py-0.5 text-xs font-extrabold text-indigo-deep">Cover</span>{/if}
				</div>
				<div class="flex gap-1 p-2">
					{#if data.coverKey !== p.storage_key}
						<form method="POST" action="?/cover" class="flex-1" use:enhance={run('cover')}>
							<input type="hidden" name="id" value={p.id} />
							<button class="btn btn-quiet min-h-9 w-full px-2 text-xs"><Star size={14} aria-hidden="true" /> Cover</button>
						</form>
					{/if}
					<form method="POST" action="?/remove" use:enhance={run('remove')}>
						<input type="hidden" name="id" value={p.id} />
						<button class="btn btn-quiet min-h-9 px-2 text-xs text-absent" aria-label="Remove photo"><Trash2 size={15} aria-hidden="true" /></button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{/if}

{#if full}
	<p class="panel mt-4 p-4 text-ink-soft">You have 5 photos. Remove one to add another.</p>
{:else}
	<form method="POST" action="?/upload" enctype="multipart/form-data" class="panel mt-4 grid gap-4 p-5" use:enhance={run('upload')}>
		<h2 class="flex items-center gap-2 text-lg"><ImagePlus size={20} aria-hidden="true" /> Add a photo ({data.photos.length} of 5)</h2>
		{#key pickerKey}<PhotoPicker />{/key}
		<label class="field"><span>What is in the photo?</span><input class="input" name="alt" maxlength="200" placeholder="Our training hall, Trophies from 2025…" /><small>Helps people who use screen readers.</small></label>
		<label class="flex items-start gap-3"><input type="checkbox" name="children" class="mt-1 h-6 w-6 shrink-0" /> <span>This photo shows children's faces</span></label>
		<button class="btn btn-primary" disabled={busy === 'upload'}>{busy === 'upload' ? 'Uploading…' : 'Upload photo'}</button>
	</form>
{/if}

<form method="POST" action="?/logo" enctype="multipart/form-data" class="panel mt-6 grid gap-4 p-5" use:enhance={run('logo')}>
	<h2 class="text-lg">Logo</h2>
	{#if data.logoKey}<img src="/media/{data.logoKey}" alt="Current logo" class="h-20 w-20 rounded-2xl object-cover" />{/if}
	{#key pickerKey}<PhotoPicker label={data.logoKey ? 'Change logo' : 'Choose logo'} maxSide={512} />{/key}
	<button class="btn btn-quiet" disabled={busy === 'logo'}>{busy === 'logo' ? 'Uploading…' : 'Save logo'}</button>
</form>

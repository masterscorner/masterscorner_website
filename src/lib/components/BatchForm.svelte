<script lang="ts">
	import { DAYS } from '#lib/options.ts';

	interface Batch {
		id: string;
		name: string;
		days: number[];
		start_time: string;
		end_time: string;
		fee_paise: number | null;
		fee_period: string;
		online_url: string | null;
		capacity: number | null;
	}
	let { batch = null }: { batch?: Batch | null } = $props();
	const key = $derived(batch?.id ?? 'new');
</script>

{#if batch}<input type="hidden" name="id" value={batch.id} />{/if}
<label class="field"><span>Batch name</span><input class="input" name="name" required maxlength="60" defaultValue={batch?.name ?? ''} placeholder="Morning kids, Weekend adults…" /></label>
<div class="field">
	<span>Days</span>
	<div class="flex flex-wrap gap-2">
		{#each DAYS as d (d.value)}
			<label class="chip"><input type="checkbox" name="days" value={d.value} defaultChecked={batch?.days.includes(d.value) ?? false} id="{key}-d{d.value}" />{d.label}</label>
		{/each}
	</div>
</div>
<div class="grid grid-cols-2 gap-3">
	<label class="field"><span>Starts</span><input class="input" type="time" name="start" required defaultValue={batch?.start_time ?? '17:00'} /></label>
	<label class="field"><span>Ends</span><input class="input" type="time" name="end" required defaultValue={batch?.end_time ?? '18:00'} /></label>
</div>
<div class="grid grid-cols-2 gap-3">
	<label class="field"><span>Fee (₹)</span><input class="input" name="fee" inputmode="numeric" maxlength="6" defaultValue={batch?.fee_paise != null ? String(batch.fee_paise / 100) : ''} /></label>
	<label class="field"><span>Per</span>
		<select class="input" name="fee_period">
			{#each [['month', 'Month'], ['quarter', '3 months'], ['term', 'Term'], ['class', 'Class']] as [v, l] (v)}
				<option value={v} selected={(batch?.fee_period ?? 'month') === v}>{l}</option>
			{/each}
		</select>
	</label>
</div>
<div class="grid grid-cols-[1fr_7rem] gap-3">
	<label class="field"><span>Online class link (optional)</span><input class="input" name="online_url" type="url" placeholder="https://meet.google.com/…" defaultValue={batch?.online_url ?? ''} /></label>
	<label class="field"><span>Seats</span><input class="input" name="capacity" inputmode="numeric" maxlength="4" defaultValue={batch?.capacity != null ? String(batch.capacity) : ''} /></label>
</div>

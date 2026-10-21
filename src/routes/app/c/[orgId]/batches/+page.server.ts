import { error, fail } from '@sveltejs/kit';
import { attempt, str } from '#lib/server/form.ts';
import { requireManager } from '#lib/server/require.ts';
import { loadSettings, saveBatch, setBatchActive, type BatchInput } from '#lib/server/services/settings.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { me, org } = await parent();
	requireManager(org.role);
	const settings = await loadSettings(locals.db, me.id, org.id);
	if (!settings) error(404, 'Class not found');
	return { batches: settings.batches };
};

function parse(d: FormData): BatchInput | string {
	const name = str(d, 'name');
	if (name.length < 1 || name.length > 60) return 'Please name the batch';
	const days = [...new Set(d.getAll('days').map(Number))].filter((x) => x >= 0 && x <= 6);
	if (!days.length) return 'Please choose the days';
	const start = str(d, 'start');
	const end = str(d, 'end');
	if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return 'Please choose the times';
	if (end <= start) return 'End time must be after start time';
	const fee = str(d, 'fee');
	if (fee && !/^\d{1,6}$/.test(fee)) return 'Fee must be a number in rupees';
	const period = str(d, 'fee_period') as BatchInput['feePeriod'];
	if (!['month', 'quarter', 'term', 'class'].includes(period)) return 'Choose the fee period';
	const online = str(d, 'online_url');
	if (online && !/^https:\/\/\S+$/.test(online)) return 'Online class link must start with https://';
	const cap = str(d, 'capacity');
	if (cap && !/^\d{1,4}$/.test(cap)) return 'Seats must be a number';
	return { name, days, start, end, feePaise: fee ? Number(fee) * 100 : null, feePeriod: period, onlineUrl: online || null, capacity: cap ? Number(cap) : null };
}

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const input = parse(d);
		if (typeof input === 'string') return fail(400, { error: input, batch: str(d, 'id') || 'new' });
		const id = str(d, 'id');
		return attempt(() => saveBatch(locals.db, me.id, params.orgId, /^[0-9a-f-]{36}$/.test(id) ? id : null, input), id ? 'Batch saved.' : 'Batch added.');
	},
	active: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		const on = str(d, 'on') === '1';
		return attempt(() => setBatchActive(locals.db, me.id, params.orgId, str(d, 'id'), on), on ? 'Batch is running again.' : 'Batch stopped. Its students and history are kept.');
	}
};

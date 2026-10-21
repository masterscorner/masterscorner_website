import { error, fail } from '@sveltejs/kit';
import { attempt, str } from '#lib/server/form.ts';
import { requireManager } from '#lib/server/require.ts';
import { addPhoto, loadSettings, makeCover, removePhoto, setLogo } from '#lib/server/services/settings.ts';
import { deleteObject, IMAGE_TYPES, looksLikeImage, MAX_IMAGE_BYTES, putObject } from '#lib/server/storage.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { me, org } = await parent();
	requireManager(org.role);
	const s = await loadSettings(locals.db, me.id, org.id);
	if (!s) error(404, 'Class not found');
	return { photos: s.photos, coverKey: s.cover_key, logoKey: s.logo_key };
};

/** Validates an uploaded image and stores it under a random name. Returns the key or an error message. */
async function store(orgId: string, file: FormDataEntryValue | null, kind: 'photo' | 'logo'): Promise<string> {
	if (!(file instanceof File) || file.size === 0) throw new UserError('Please choose a photo');
	if (file.size > MAX_IMAGE_BYTES) throw new UserError('Photo is too big (max 3 MB)');
	const ext = IMAGE_TYPES[file.type];
	if (!ext) throw new UserError('Use a JPG, PNG or WebP photo');
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!looksLikeImage(bytes, file.type)) throw new UserError('This file is not a photo');
	const key = `orgs/${orgId}/${kind}-${crypto.randomUUID()}.${ext}`;
	await putObject(key, bytes.buffer as ArrayBuffer, file.type);
	return key;
}

class UserError extends Error {}

export const actions: Actions = {
	upload: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		if (d.get('children') === 'on') {
			return fail(400, { error: 'Photos that show children are not put on public pages. Please choose a photo of the place, equipment or adults.' });
		}
		const alt = str(d, 'alt').slice(0, 200) || 'Class photo';
		let key: string;
		try {
			key = await store(params.orgId, d.get('photo'), 'photo');
		} catch (err) {
			return fail(400, { error: err instanceof UserError ? err.message : 'Could not upload. Please try again.' });
		}
		const res = await attempt(() => addPhoto(locals.db, me.id, params.orgId, key, alt.length >= 3 ? alt : 'Class photo'), 'Photo added.', 'Could not add. You can have up to 5 photos.');
		if ('status' in res) await deleteObject(key).catch(() => {});
		return res;
	},
	remove: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		let key: string | null = null;
		const res = await attempt(async () => {
			key = await removePhoto(locals.db, me.id, params.orgId, str(d, 'id'));
		}, 'Photo removed.');
		if (key) await deleteObject(key).catch(() => {});
		return res;
	},
	cover: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		return attempt(() => makeCover(locals.db, me.id, params.orgId, str(d, 'id')), 'Cover photo changed.');
	},
	logo: async ({ request, locals, params }) => {
		const me = await locals.me();
		if (!me) return fail(401, { error: 'Please sign in again' });
		const d = await request.formData();
		let key: string;
		try {
			key = await store(params.orgId, d.get('photo'), 'logo');
		} catch (err) {
			return fail(400, { error: err instanceof UserError ? err.message : 'Could not upload. Please try again.' });
		}
		let old: string | null = null;
		const res = await attempt(async () => {
			old = await setLogo(locals.db, me.id, params.orgId, key);
		}, 'Logo saved.');
		if (old) await deleteObject(old).catch(() => {});
		return res;
	}
};

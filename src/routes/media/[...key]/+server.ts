// Serves class photos. Keys are random, so files can be cached forever.
import { error } from '@sveltejs/kit';
import { getObject } from '#lib/server/storage.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!params.key.startsWith('orgs/')) error(404, 'Not found');
	let obj;
	try {
		obj = await getObject(params.key);
	} catch {
		error(404, 'Not found');
	}
	if (!obj) error(404, 'Not found');
	return new Response(obj.body, {
		headers: {
			'content-type': obj.contentType,
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff'
		}
	});
};

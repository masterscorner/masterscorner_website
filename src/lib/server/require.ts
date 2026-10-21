import { error } from '@sveltejs/kit';

/** Stops instructors (and anyone else) from owner/admin pages. */
export function requireManager(role: string) {
	if (role !== 'owner' && role !== 'admin') error(403, 'Only the owner or admin can change this');
}

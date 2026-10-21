// Receives attendance saved on a phone while it was offline. Safe to resend: each mark has its own id.
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { markAttendance } from '#lib/server/services/attendance.ts';
import type { RequestHandler } from './$types';

const Body = v.object({
	orgId: v.pipe(v.string(), v.uuid()),
	sessionId: v.pipe(v.string(), v.uuid()),
	marks: v.pipe(
		v.array(
			v.object({
				id: v.pipe(v.string(), v.uuid()),
				personId: v.pipe(v.string(), v.uuid()),
				status: v.picklist(['present', 'absent', 'late', 'excused'])
			})
		),
		v.maxLength(500)
	)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const me = await locals.me();
	if (!me) error(401, 'Please sign in again');
	const parsed = v.safeParse(Body, await request.json().catch(() => null));
	if (!parsed.success) error(400, 'Bad attendance data');
	const { orgId, sessionId, marks } = parsed.output;
	const saved = await markAttendance(locals.db, me.id, orgId, sessionId, marks);
	return Response.json({ saved });
};

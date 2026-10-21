// Attendance taken without internet is kept on the phone (IndexedDB) and sent when the network returns.
import { del, entries, set } from 'idb-keyval';

export interface QueuedAttendance {
	orgId: string;
	sessionId: string;
	marks: { id: string; personId: string; status: string }[];
	savedAt: number;
}

const key = (sessionId: string) => `attendance:${sessionId}`;

export async function queueAttendance(item: QueuedAttendance) {
	await set(key(item.sessionId), item);
}

export async function pendingCount(): Promise<number> {
	const all = await entries();
	return all.filter(([k]) => String(k).startsWith('attendance:')).length;
}

/** Sends everything waiting. Returns how many batches were sent. */
export async function flushAttendance(): Promise<number> {
	let sent = 0;
	for (const [k, value] of await entries()) {
		if (!String(k).startsWith('attendance:')) continue;
		const item = value as QueuedAttendance;
		try {
			const res = await fetch('/api/attendance', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ orgId: item.orgId, sessionId: item.sessionId, marks: item.marks })
			});
			if (res.ok || res.status === 400 || res.status === 403) {
				// 400/403 will never succeed later either; drop instead of retrying forever.
				await del(k);
				if (res.ok) sent++;
			}
		} catch {
			// still offline
		}
	}
	return sent;
}

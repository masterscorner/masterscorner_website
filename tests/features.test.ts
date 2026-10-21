// Reviews, levels, staff invites, enquiries, the learner view and class insights.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClass } from '../src/lib/server/services/classes.ts';
import { listEnquiries, listReviews, replyToReview, updateEnquiry } from '../src/lib/server/services/inbox.ts';
import { classInsights } from '../src/lib/server/services/insights.ts';
import { learnerView, saveReview } from '../src/lib/server/services/learner.ts';
import { awardLevel, levelsPage, revokeAward, useTemplate } from '../src/lib/server/services/levels.ts';
import { staffOrg } from '../src/lib/server/services/org.ts';
import { acceptInvite, inviteStaff, myInvites } from '../src/lib/server/services/staff.ts';
import { addStudent } from '../src/lib/server/services/students.ts';
import { markAttendance } from '../src/lib/server/services/attendance.ts';
import { closeDb, db, denied, makeAdult, sampleClass } from './helpers.ts';

const today = '2026-10-19';
let owner: { id: string; phone: string };
let stranger: { id: string; phone: string };
let teacher: { id: string; phone: string };
let orgId: string;
let batchId: string;
let student: string;
let quiet: string; // a student who stopped coming
const sessions: string[] = [];

beforeAll(async () => {
	const karate = await db().selectFrom('activity_nodes').select('id').where('slug', '=', 'karate').executeTakeFirstOrThrow();
	owner = await makeAdult('Features Owner');
	stranger = await makeAdult('Stranger');
	teacher = await makeAdult('New Teacher');
	orgId = (await createClass(db(), owner.id, sampleClass('Features Dojo', [karate.id]))).id;
	await createClass(db(), stranger.id, sampleClass('Stranger Dojo', [karate.id]));
	batchId = (await db().selectFrom('batches').select('id').where('org_id', '=', orgId).executeTakeFirstOrThrow()).id;
	student = await addStudent(db(), owner.id, orgId, { name: 'Arun', isChild: false, phone: '+919000022222', guardianPhone: null, batchId });
	quiet = await addStudent(db(), owner.id, orgId, { name: 'Bala', isChild: false, phone: '+919000033333', guardianPhone: null, batchId });
	await db().updateTable('persons').set({ user_id: 'arun-login', birth_date: '1995-05-05' }).where('id', '=', student).execute();
	await db().updateTable('enrolments').set({ joined_on: '2026-09-02' }).where('org_id', '=', orgId).execute();
	for (const d of ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16']) {
		const s = await db().insertInto('class_sessions').values({ org_id: orgId, batch_id: batchId, on_date: d }).returning('id').executeTakeFirstOrThrow();
		sessions.push(s.id);
	}
});
afterAll(closeDb);

describe('reviews', () => {
	it('a student cannot review before coming to class', async () => {
		await denied(saveReview(db(), student, orgId, 5, 'Great'));
	});

	it('after attending, the student can review and the teacher can reply', async () => {
		await markAttendance(db(), owner.id, orgId, sessions[0], [{ id: crypto.randomUUID(), personId: student, status: 'present' }]);
		await saveReview(db(), student, orgId, 4, 'Good teaching');
		const [r] = await listReviews(db(), owner.id, orgId);
		expect(r.rating).toBe(4);
		await replyToReview(db(), owner.id, orgId, r.id, 'Thank you Arun');
		expect((await listReviews(db(), owner.id, orgId))[0].reply).toBe('Thank you Arun');
	});

	it('another class cannot reply', async () => {
		const [r] = await listReviews(db(), owner.id, orgId);
		await expect(replyToReview(db(), stranger.id, orgId, r.id, 'Spam')).rejects.toThrow();
		await closeDb();
	});
});

describe('learner view', () => {
	it('the student sees their own record, a stranger sees nothing', async () => {
		const mine = await learnerView(db(), student, student, orgId, '2026-09-01');
		expect(mine?.attendance.length).toBe(1);
		expect(await learnerView(db(), stranger.id, student, orgId, '2026-09-01')).toBeNull();
	});
});

describe('levels', () => {
	it('uses a ready-made belt list and gives a level', async () => {
		const t = await db().selectFrom('level_systems').select('id').where('name', '=', 'Karate belts (kyu)').executeTakeFirstOrThrow();
		await useTemplate(db(), owner.id, orgId, t.id);
		const page = await levelsPage(db(), owner.id, orgId);
		expect(page.levels.length).toBeGreaterThan(3);
		await awardLevel(db(), owner.id, orgId, student, page.levels[1].id, '2026-10-06', 'First grading');
		const after = await levelsPage(db(), owner.id, orgId);
		const arun = after.students.find((s) => s.person_id === student)!;
		expect(arun.level_name).toBe(page.levels[1].name);
		expect(arun.classes_since).toBe(0); // attended on the 5th, levelled on the 6th
	});

	it('another class cannot give levels here', async () => {
		const page = await levelsPage(db(), owner.id, orgId);
		await expect(awardLevel(db(), stranger.id, orgId, student, page.levels[0].id, today, null)).rejects.toThrow();
		await closeDb();
	});

	it('a mistaken level can be taken back, and stays in history', async () => {
		const page = await levelsPage(db(), owner.id, orgId);
		const award = page.students.find((s) => s.person_id === student)!.history[0];
		await revokeAward(db(), owner.id, orgId, award.id);
		const after = (await levelsPage(db(), owner.id, orgId)).students.find((s) => s.person_id === student)!;
		expect(after.level_name).toBeNull();
		expect(after.history[0].revoked).toBe(true);
	});
});

describe('staff invites', () => {
	it('the invited phone sees the invite and joins as a teacher', async () => {
		await inviteStaff(db(), owner.id, orgId, teacher.phone, 'instructor');
		const invites = await myInvites(db(), teacher.id);
		expect(invites.map((i) => i.org_name)).toContain('Features Dojo');
		const joined = await acceptInvite(db(), teacher.id, invites.find((i) => i.org_id === orgId)!.id);
		expect(joined).toBe(orgId);
		expect((await staffOrg(db(), teacher.id, orgId))?.role).toBe('instructor');
	});

	it('a teacher cannot invite more staff', async () => {
		await denied(inviteStaff(db(), teacher.id, orgId, '+919111122222', 'admin'));
	});

	it('nobody else can use the invite', async () => {
		expect((await myInvites(db(), stranger.id)).some((i) => i.org_id === orgId)).toBe(false);
	});
});

describe('enquiries', () => {
	it('only the class can see and update its enquiries', async () => {
		await db().insertInto('enquiries').values({ org_id: orgId, name: 'Meena', phone_e164: '+919222233333', message: 'Timings for kids?', for_child: true }).execute();
		const [e] = await listEnquiries(db(), owner.id, orgId);
		expect(e.name).toBe('Meena');
		expect(await listEnquiries(db(), stranger.id, orgId)).toHaveLength(0);
		await expect(updateEnquiry(db(), stranger.id, orgId, e.id, 'closed', null)).rejects.toThrow();
		await closeDb();
		await updateEnquiry(db(), owner.id, orgId, e.id, 'trial_booked', 'Coming Saturday');
		expect((await listEnquiries(db(), owner.id, orgId))[0].status).toBe('trial_booked');
	});
});

describe('insights', () => {
	it('counts attendance by week and finds students who stopped coming', async () => {
		for (const s of sessions.slice(1)) {
			await markAttendance(db(), owner.id, orgId, s, [
				{ id: crypto.randomUUID(), personId: student, status: 'present' },
				{ id: crypto.randomUUID(), personId: quiet, status: 'absent' }
			]);
		}
		const d = await classInsights(db(), owner.id, orgId, today, true);
		expect(d.weeks).toHaveLength(12);
		const last2 = d.weeks.slice(-3, -1); // weeks of 5 Oct and 12 Oct
		expect(last2.map((w) => w.came)).toEqual([3, 3]);
		expect(last2.map((w) => w.marked)).toEqual([5, 6]);
		expect(d.atRisk.map((s) => s.display_name)).toEqual(['Bala']);
		expect(d.students.active).toBe(2);
		expect(d.months.find((m) => m.month === '2026-09-01')?.joined).toBe(2);
		expect(d.fees).toHaveLength(6);
	});

	it('teachers get insights without fees; strangers see an empty class', async () => {
		expect((await classInsights(db(), teacher.id, orgId, today, false)).fees).toBeNull();
		const s = await classInsights(db(), stranger.id, orgId, today, true);
		expect(s.students.active).toBe(0);
		expect(s.weeks.every((w) => w.marked === 0)).toBe(true);
	});
});

import { sql } from 'kysely';
import { asPerson, type DB } from '../db-core.ts';

export interface StaffMember {
	person_id: string;
	display_name: string;
	phone_e164: string | null;
	role: 'owner' | 'admin' | 'instructor';
	status: string;
}

export interface StaffPage {
	members: StaffMember[];
	invites: { id: string; phone_e164: string; role: string; created_at: string }[];
}

export function staffPage(db: DB, personId: string, orgId: string): Promise<StaffPage> {
	return asPerson(db, personId, async (tx) => {
		const { rows: members } = await sql<StaffMember>`select * from app.staff_list(${orgId}::uuid) where status = 'active'`.execute(tx);
		const invites = await tx
			.selectFrom('staff_invites')
			.select(['id', 'phone_e164', 'role', sql<string>`to_char(created_at, 'YYYY-MM-DD')`.as('created_at')])
			.where('org_id', '=', orgId)
			.where('accepted_at', 'is', null)
			.where('revoked_at', 'is', null)
			.orderBy('created_at', 'desc')
			.execute();
		return { members, invites };
	});
}

export function inviteStaff(db: DB, personId: string, orgId: string, phone: string, role: 'admin' | 'instructor') {
	return asPerson(db, personId, async (tx) => {
		await tx.insertInto('staff_invites').values({ org_id: orgId, phone_e164: phone, role, invited_by: personId }).execute();
		await tx.insertInto('audit_log').values({ actor_id: personId, org_id: orgId, action: 'staff.invite', target_type: 'phone', details: JSON.stringify({ role }) }).execute();
	});
}

export function cancelInvite(db: DB, personId: string, orgId: string, inviteId: string) {
	return asPerson(db, personId, (tx) =>
		tx.updateTable('staff_invites').set({ revoked_at: new Date() }).where('id', '=', inviteId).where('org_id', '=', orgId).execute()
	);
}

/** Owners stay; others can be removed. Their past attendance marks keep their name. */
export function removeStaff(db: DB, personId: string, orgId: string, memberId: string) {
	return asPerson(db, personId, async (tx) => {
		const res = await tx
			.updateTable('org_members')
			.set({ status: 'removed' })
			.where('org_id', '=', orgId)
			.where('person_id', '=', memberId)
			.where('role', '!=', 'owner')
			.executeTakeFirst();
		if (Number(res.numUpdatedRows) === 0) throw new Error('Not allowed');
		await tx.insertInto('audit_log').values({ actor_id: personId, org_id: orgId, action: 'staff.remove', target_type: 'person', target_id: memberId }).execute();
	});
}

export interface MyInvite {
	id: string;
	org_id: string;
	org_name: string;
	role: string;
}

export function myInvites(db: DB, personId: string): Promise<MyInvite[]> {
	return asPerson(db, personId, async (tx) => (await sql<MyInvite>`select * from app.my_staff_invites()`.execute(tx)).rows);
}

export function acceptInvite(db: DB, personId: string, inviteId: string): Promise<string> {
	return asPerson(db, personId, async (tx) => {
		const { rows } = await sql<{ org_id: string }>`select app.accept_staff_invite(${inviteId}::uuid) as org_id`.execute(tx);
		return rows[0].org_id;
	});
}

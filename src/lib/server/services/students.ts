import { sql } from 'kysely';
import { asPerson, type DB } from '../db-core.ts';
import type { EnrolmentStatus } from '../db-types.ts';
import { NOTICE_VERSION } from './people.ts';

export interface StudentRow {
	person_id: string;
	display_name: string;
	phone_e164: string | null;
	is_minor: boolean;
	enrolment_id: string;
	batch_id: string;
	batch_name: string;
	status: EnrolmentStatus;
	joined_on: string;
	guardian_phone: string | null;
}

export function listStudents(db: DB, personId: string, orgId: string): Promise<StudentRow[]> {
	return asPerson(db, personId, (tx) =>
		tx
			.selectFrom('enrolments as e')
			.innerJoin('persons as p', 'p.id', 'e.person_id')
			.innerJoin('batches as b', 'b.id', 'e.batch_id')
			.leftJoin('guardianships as g', (j) =>
				j.onRef('g.child_id', '=', 'p.id').on('g.invited_by_org', '=', orgId)
			)
			.select([
				'p.id as person_id',
				'p.display_name',
				'p.phone_e164',
				'p.is_minor',
				'e.id as enrolment_id',
				'e.batch_id',
				'b.name as batch_name',
				'e.status',
				'e.joined_on',
				'g.invited_phone as guardian_phone'
			])
			.where('e.org_id', '=', orgId)
			.where('e.status', '!=', 'left')
			.orderBy('p.display_name')
			.execute()
	);
}

export interface AddStudentInput {
	name: string;
	isChild: boolean;
	phone: string | null;
	guardianPhone: string | null;
	batchId: string;
}

/**
 * Adds a student to a batch. Adults are active at once. A child stays "waiting for parent"
 * until the parent confirms with their own phone (DPDP verifiable consent).
 */
export async function addStudent(db: DB, personId: string, orgId: string, input: AddStudentInput): Promise<string> {
	return asPerson(db, personId, async (tx) => {
		const student = await tx
			.insertInto('persons')
			.values({
				display_name: input.name,
				phone_e164: input.isChild ? null : input.phone,
				is_minor: input.isChild,
				created_by: personId
			})
			.returning('id')
			.executeTakeFirstOrThrow();

		if (input.isChild) {
			await tx
				.insertInto('guardianships')
				.values({ child_id: student.id, invited_phone: input.guardianPhone, invited_by_org: orgId })
				.execute();
		}

		await tx
			.insertInto('enrolments')
			.values({
				org_id: orgId,
				batch_id: input.batchId,
				person_id: student.id,
				status: input.isChild ? 'pending_consent' : 'active',
				created_by: personId
			})
			.execute();

		await tx
			.insertInto('audit_log')
			.values({ actor_id: personId, org_id: orgId, action: 'student.add', target_type: 'person', target_id: student.id })
			.execute();
		return student.id;
	});
}

export interface PendingChild {
	guardianship_id: string;
	child_name: string;
	class_name: string;
	class_slug: string;
}

/** Children a class has added under this parent's phone, waiting for the parent to confirm. */
export function pendingChildren(db: DB, personId: string): Promise<PendingChild[]> {
	return asPerson(db, personId, async (tx) => {
		const { rows } = await sql<PendingChild>`
			select g.id as guardianship_id, c.display_name as child_name, o.name as class_name, o.slug as class_slug
			from guardianships g
			join persons c on c.id = g.child_id
			left join orgs o on o.id = g.invited_by_org
			where g.guardian_id = app.person_id() and g.status = 'pending'
			order by g.created_at
		`.execute(tx);
		return rows;
	});
}

export function confirmChild(db: DB, personId: string, guardianshipId: string) {
	return asPerson(db, personId, (tx) =>
		sql`select app.confirm_guardianship(${guardianshipId}::uuid, ${NOTICE_VERSION})`.execute(tx)
	);
}

export function declineChild(db: DB, personId: string, guardianshipId: string) {
	return asPerson(db, personId, (tx) => sql`select app.decline_guardianship(${guardianshipId}::uuid)`.execute(tx));
}

export interface MyChild {
	id: string;
	display_name: string;
}

export function myChildren(db: DB, personId: string): Promise<MyChild[]> {
	return asPerson(db, personId, (tx) =>
		tx
			.selectFrom('guardianships as g')
			.innerJoin('persons as c', 'c.id', 'g.child_id')
			.select(['c.id', 'c.display_name'])
			.where('g.guardian_id', '=', personId)
			.where('g.status', '=', 'active')
			.orderBy('c.display_name')
			.execute()
	);
}

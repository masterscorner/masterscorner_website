import { asPerson, type DB } from '../db-core.ts';
import type { StaffRole } from '../db-types.ts';

export interface StaffOrg {
	id: string;
	slug: string;
	name: string;
	timezone: string;
	upi_id: string | null;
	status: string;
	role: StaffRole;
	batches: { id: string; name: string }[];
}

/** The class as seen by one of its staff, or null when this person is not staff there. */
export function staffOrg(db: DB, personId: string, orgId: string): Promise<StaffOrg | null> {
	if (!/^[0-9a-f-]{36}$/i.test(orgId)) return Promise.resolve(null);
	return asPerson(db, personId, async (tx) => {
		const org = await tx
			.selectFrom('orgs as o')
			.innerJoin('org_members as m', (j) => j.onRef('m.org_id', '=', 'o.id').on('m.person_id', '=', personId).on('m.status', '=', 'active'))
			.select(['o.id', 'o.slug', 'o.name', 'o.timezone', 'o.upi_id', 'o.status', 'm.role'])
			.where('o.id', '=', orgId)
			.executeTakeFirst();
		if (!org) return null;
		const batches = await tx
			.selectFrom('batches')
			.select(['id', 'name'])
			.where('org_id', '=', orgId)
			.where('active', '=', true)
			.orderBy('start_time')
			.execute();
		return { ...org, batches };
	});
}

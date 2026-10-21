import { sql } from 'kysely';
import { asPerson, type DB, type Tx } from '../db-core.ts';

export interface NewClassInput {
	name: string;
	activityIds: number[];
	city: string;
	state?: string | null;
	addressLine: string;
	locality?: string | null;
	postalCode?: string | null;
	lat: number;
	lng: number;
	precise: boolean;
	whatsapp?: string | null;
	showWhatsapp: boolean;
	phone?: string | null;
	showPhone: boolean;
	teachingLanguages: string[];
	ageGroups: string[];
	upiId?: string | null;
	batch: {
		name: string;
		days: number[];
		start: string;
		end: string;
		feePaise: number | null;
		feePeriod: 'month' | 'quarter' | 'term' | 'class';
	};
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50);
}

function randomSuffix(): string {
	return Math.random().toString(36).slice(2, 6);
}

/** Creates the class, its first place and first batch, and publishes it. Returns the class id. */
export async function createClass(db: DB, personId: string, input: NewClassInput): Promise<{ id: string; slug: string }> {
	const base = slugify(`${input.name} ${input.city}`) || 'class';
	for (let attempt = 0; attempt < 5; attempt++) {
		const slug = attempt === 0 ? base : `${base.slice(0, 44)}-${randomSuffix()}`;
		try {
			return await asPerson(db, personId, (tx) => insertClass(tx, slug, input));
		} catch (err) {
			if ((err as { code?: string }).code === '23505' && String((err as Error).message).includes('slug')) continue;
			throw err;
		}
	}
	throw new Error('Could not create a unique web address for this class');
}

async function insertClass(tx: Tx, slug: string, input: NewClassInput) {
	const { rows } = await sql<{ id: string }>`select app.create_org(${slug}, ${input.name}) as id`.execute(tx);
	const id = rows[0].id;

	await tx
		.updateTable('orgs')
		.set({
			whatsapp_e164: input.whatsapp ?? null,
			show_whatsapp: input.showWhatsapp,
			phone_e164: input.phone ?? null,
			show_phone: input.showPhone,
			teaching_languages: input.teachingLanguages,
			age_groups: input.ageGroups,
			upi_id: input.upiId ?? null,
			fee_min_paise: input.batch.feePaise,
			fee_max_paise: input.batch.feePaise,
			// Start with the ready-made level list for the main activity (for example karate belts).
			level_system_id: sql<number | null>`(select s.id from level_systems s
				where s.org_id is null and s.activity_id = ${input.activityIds[0] ?? null}::int order by s.id limit 1)`,
			status: 'published'
		})
		.where('id', '=', id)
		.execute();

	if (input.activityIds.length) {
		await tx
			.insertInto('org_activities')
			.values(input.activityIds.map((activity_id) => ({ org_id: id, activity_id })))
			.execute();
	}

	const branch = await tx
		.insertInto('branches')
		.values({
			org_id: id,
			address_line: input.addressLine,
			locality: input.locality ?? null,
			city: input.city,
			state: input.state ?? null,
			postal_code: input.postalCode ?? null,
			location: sql<string>`st_setsrid(st_makepoint(${input.lng}, ${input.lat}), 4326)::geography`,
			location_precise: input.precise
		})
		.returning('id')
		.executeTakeFirstOrThrow();

	await tx
		.insertInto('batches')
		.values({
			org_id: id,
			branch_id: branch.id,
			name: input.batch.name,
			activity_id: input.activityIds[0] ?? null,
			days: input.batch.days,
			start_time: input.batch.start,
			end_time: input.batch.end,
			fee_paise: input.batch.feePaise,
			fee_period: input.batch.feePeriod
		})
		.execute();

	await tx.insertInto('audit_log').values({ actor_id: sql`app.person_id()`, org_id: id, action: 'org.publish', target_type: 'org', target_id: id }).execute();
	return { id, slug };
}

export interface StaffClass {
	id: string;
	slug: string;
	name: string;
	role: 'owner' | 'admin' | 'instructor';
	status: string;
}

export function myClasses(db: DB, personId: string): Promise<StaffClass[]> {
	return asPerson(db, personId, (tx) =>
		tx
			.selectFrom('org_members as m')
			.innerJoin('orgs as o', 'o.id', 'm.org_id')
			.select(['o.id', 'o.slug', 'o.name', 'm.role', 'o.status'])
			.where('m.person_id', '=', personId)
			.where('m.status', '=', 'active')
			.orderBy('o.created_at')
			.execute()
	);
}

/** Returns the person's role in the class, or null when they are not staff there. */
export async function staffRole(tx: Tx, orgId: string, personId: string) {
	const row = await tx
		.selectFrom('org_members')
		.select('role')
		.where('org_id', '=', orgId)
		.where('person_id', '=', personId)
		.where('status', '=', 'active')
		.executeTakeFirst();
	return row?.role ?? null;
}

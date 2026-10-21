import { sql } from 'kysely';
import { asPerson, type DB, type Tx } from '../db-core.ts';

export interface ClassSettings {
	id: string;
	slug: string;
	name: string;
	about: string | null;
	status: 'draft' | 'published' | 'suspended';
	phone_e164: string | null;
	show_phone: boolean;
	whatsapp_e164: string | null;
	show_whatsapp: boolean;
	email: string | null;
	show_email: boolean;
	upi_id: string | null;
	teaching_languages: string[];
	age_groups: string[];
	women_only: boolean;
	online: boolean;
	fee_due_day: number;
	level_system_id: number | null;
	logo_key: string | null;
	cover_key: string | null;
	activity_ids: number[];
	branch: {
		id: string;
		address_line: string;
		locality: string | null;
		city: string;
		state: string | null;
		postal_code: string | null;
		lat: number;
		lng: number;
		location_precise: boolean;
	} | null;
	batches: {
		id: string;
		name: string;
		days: number[];
		start_time: string;
		end_time: string;
		fee_paise: number | null;
		fee_period: 'month' | 'quarter' | 'term' | 'class';
		online_url: string | null;
		capacity: number | null;
		active: boolean;
		students: number;
	}[];
	photos: { id: string; storage_key: string; alt_text: string; sort: number }[];
}

export function loadSettings(db: DB, personId: string, orgId: string): Promise<ClassSettings | null> {
	return asPerson(db, personId, async (tx) => {
		const { rows } = await sql<ClassSettings>`
			select o.id, o.slug, o.name, o.about, o.status, o.phone_e164, o.show_phone, o.whatsapp_e164, o.show_whatsapp,
				o.email, o.show_email, o.upi_id, o.teaching_languages, o.age_groups, o.women_only, o.online,
				o.fee_due_day, o.level_system_id, o.logo_key, o.cover_key,
				coalesce((select array_agg(activity_id) from org_activities where org_id = o.id), '{}') as activity_ids,
				(select json_build_object('id', b.id, 'address_line', b.address_line, 'locality', b.locality, 'city', b.city,
						'state', b.state, 'postal_code', b.postal_code, 'lat', st_y(b.location::geometry), 'lng', st_x(b.location::geometry),
						'location_precise', b.location_precise)
					from branches b where b.org_id = o.id order by b.created_at limit 1) as branch,
				coalesce((select json_agg(json_build_object('id', b.id, 'name', b.name, 'days', b.days,
						'start_time', to_char(b.start_time, 'HH24:MI'), 'end_time', to_char(b.end_time, 'HH24:MI'),
						'fee_paise', b.fee_paise, 'fee_period', b.fee_period, 'online_url', b.online_url, 'capacity', b.capacity,
						'active', b.active,
						'students', (select count(*) from enrolments e where e.batch_id = b.id and e.status in ('active', 'trial', 'pending_consent')))
						order by b.active desc, b.start_time)
					from batches b where b.org_id = o.id), '[]') as batches,
				coalesce((select json_agg(json_build_object('id', p.id, 'storage_key', p.storage_key, 'alt_text', p.alt_text, 'sort', p.sort) order by p.sort, p.created_at)
					from photos p where p.org_id = o.id), '[]') as photos
			from orgs o where o.id = ${orgId} and app.is_staff(o.id, array['owner', 'admin'])
		`.execute(tx);
		return rows[0] ?? null;
	});
}

export interface DetailsInput {
	name: string;
	about: string | null;
	activityIds: number[];
	phone: string | null;
	showPhone: boolean;
	whatsapp: string | null;
	showWhatsapp: boolean;
	email: string | null;
	showEmail: boolean;
	upiId: string | null;
	teachingLanguages: string[];
	ageGroups: string[];
	womenOnly: boolean;
	online: boolean;
	feeDueDay: number;
	published: boolean;
}

export function saveDetails(db: DB, personId: string, orgId: string, input: DetailsInput) {
	return asPerson(db, personId, async (tx) => {
		const res = await tx
			.updateTable('orgs')
			.set({
				name: input.name,
				about: input.about,
				phone_e164: input.phone,
				show_phone: input.showPhone && Boolean(input.phone),
				whatsapp_e164: input.whatsapp,
				show_whatsapp: input.showWhatsapp && Boolean(input.whatsapp),
				email: input.email,
				show_email: input.showEmail && Boolean(input.email),
				upi_id: input.upiId,
				teaching_languages: input.teachingLanguages,
				age_groups: input.ageGroups,
				women_only: input.womenOnly,
				online: input.online,
				fee_due_day: input.feeDueDay,
				status: input.published ? 'published' : 'draft'
			})
			.where('id', '=', orgId)
			.where('status', '!=', 'suspended')
			.executeTakeFirst();
		if (Number(res.numUpdatedRows) === 0) throw new Error('Not allowed');
		if (input.activityIds.length) {
			await tx.deleteFrom('org_activities').where('org_id', '=', orgId).execute();
			await tx.insertInto('org_activities').values(input.activityIds.map((activity_id) => ({ org_id: orgId, activity_id }))).execute();
		}
		await refreshFeeRange(tx, orgId);
		await tx.insertInto('audit_log').values({ actor_id: personId, org_id: orgId, action: 'org.update', target_type: 'org', target_id: orgId }).execute();
	});
}

export interface AddressInput {
	addressLine: string;
	locality: string | null;
	city: string;
	state: string | null;
	postalCode: string | null;
	lat: number;
	lng: number;
	precise: boolean;
}

export function saveAddress(db: DB, personId: string, orgId: string, branchId: string, input: AddressInput) {
	return asPerson(db, personId, async (tx) => {
		const res = await tx
			.updateTable('branches')
			.set({
				address_line: input.addressLine,
				locality: input.locality,
				city: input.city,
				state: input.state,
				postal_code: input.postalCode,
				location: sql<string>`st_setsrid(st_makepoint(${input.lng}, ${input.lat}), 4326)::geography`,
				location_precise: input.precise
			})
			.where('id', '=', branchId)
			.where('org_id', '=', orgId)
			.executeTakeFirst();
		if (Number(res.numUpdatedRows) === 0) throw new Error('Not allowed');
	});
}

export interface BatchInput {
	name: string;
	days: number[];
	start: string;
	end: string;
	feePaise: number | null;
	feePeriod: 'month' | 'quarter' | 'term' | 'class';
	onlineUrl: string | null;
	capacity: number | null;
}

async function refreshFeeRange(tx: Tx, orgId: string) {
	await sql`
		update orgs o set fee_min_paise = r.lo, fee_max_paise = r.hi
		from (select min(fee_paise) as lo, max(fee_paise) as hi from batches where org_id = ${orgId} and active and fee_paise > 0) r
		where o.id = ${orgId}
	`.execute(tx);
}

export function saveBatch(db: DB, personId: string, orgId: string, batchId: string | null, input: BatchInput) {
	return asPerson(db, personId, async (tx) => {
		const values = {
			name: input.name,
			days: input.days,
			start_time: input.start,
			end_time: input.end,
			fee_paise: input.feePaise,
			fee_period: input.feePeriod,
			online_url: input.onlineUrl,
			capacity: input.capacity
		};
		if (batchId) {
			const res = await tx.updateTable('batches').set(values).where('id', '=', batchId).where('org_id', '=', orgId).executeTakeFirst();
			if (Number(res.numUpdatedRows) === 0) throw new Error('Not allowed');
		} else {
			const branch = await tx.selectFrom('branches').select('id').where('org_id', '=', orgId).orderBy('created_at').executeTakeFirst();
			const act = await tx.selectFrom('org_activities').select('activity_id').where('org_id', '=', orgId).executeTakeFirst();
			await tx.insertInto('batches').values({ ...values, org_id: orgId, branch_id: branch?.id ?? null, activity_id: act?.activity_id ?? null }).execute();
		}
		await refreshFeeRange(tx, orgId);
	});
}

export function setBatchActive(db: DB, personId: string, orgId: string, batchId: string, active: boolean) {
	return asPerson(db, personId, async (tx) => {
		await tx.updateTable('batches').set({ active }).where('id', '=', batchId).where('org_id', '=', orgId).execute();
		await refreshFeeRange(tx, orgId);
	});
}

export function addPhoto(db: DB, personId: string, orgId: string, key: string, alt: string) {
	return asPerson(db, personId, async (tx) => {
		const count = await tx.selectFrom('photos').select(sql<number>`count(*)::int`.as('n')).where('org_id', '=', orgId).executeTakeFirstOrThrow();
		if (count.n >= 5) throw new Error('Up to 5 photos');
		await tx.insertInto('photos').values({ org_id: orgId, storage_key: key, alt_text: alt, sort: count.n }).execute();
		await tx.updateTable('orgs').set({ cover_key: sql`coalesce(cover_key, ${key})` }).where('id', '=', orgId).execute();
	});
}

export function removePhoto(db: DB, personId: string, orgId: string, photoId: string): Promise<string | null> {
	return asPerson(db, personId, async (tx) => {
		const row = await tx.deleteFrom('photos').where('id', '=', photoId).where('org_id', '=', orgId).returning('storage_key').executeTakeFirst();
		if (!row) return null;
		const next = await tx.selectFrom('photos').select('storage_key').where('org_id', '=', orgId).orderBy('sort').executeTakeFirst();
		await tx
			.updateTable('orgs')
			.set({ cover_key: sql`case when cover_key = ${row.storage_key} then ${next?.storage_key ?? null} else cover_key end` })
			.where('id', '=', orgId)
			.execute();
		return row.storage_key;
	});
}

export function makeCover(db: DB, personId: string, orgId: string, photoId: string) {
	return asPerson(db, personId, async (tx) => {
		const p = await tx.selectFrom('photos').select('storage_key').where('id', '=', photoId).where('org_id', '=', orgId).executeTakeFirst();
		if (p) await tx.updateTable('orgs').set({ cover_key: p.storage_key }).where('id', '=', orgId).execute();
	});
}

export function setLogo(db: DB, personId: string, orgId: string, key: string | null): Promise<string | null> {
	return asPerson(db, personId, async (tx) => {
		const old = await tx.selectFrom('orgs').select('logo_key').where('id', '=', orgId).executeTakeFirst();
		await tx.updateTable('orgs').set({ logo_key: key }).where('id', '=', orgId).execute();
		return old?.logo_key ?? null;
	});
}

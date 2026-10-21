import { sql } from 'kysely';
import { asPerson, type DB } from '../db-core.ts';

export interface ClassProfile {
	id: string;
	slug: string;
	name: string;
	about: string | null;
	phone_e164: string | null;
	whatsapp_e164: string | null;
	email: string | null;
	teaching_languages: string[];
	age_groups: string[];
	women_only: boolean;
	is_sample: boolean;
	online: boolean;
	fee_min_paise: number | null;
	fee_max_paise: number | null;
	rating_avg: string | null;
	rating_count: number;
	address_line: string;
	locality: string | null;
	city: string;
	state: string | null;
	postal_code: string | null;
	lat: number;
	lng: number;
	location_precise: boolean;
	activities: { name: string; emoji: string | null; slug: string; cat: string }[];
	level_colors: string[];
	level_names: string[];
	batches: { id: string; name: string; days: number[]; start_time: string; end_time: string; fee_paise: number | null; fee_period: string }[];
	reviews: { id: string; rating: number; body: string | null; author: string; created_at: string; reply: string | null }[];
	photos: { storage_key: string; alt_text: string; width: number | null; height: number | null }[];
}

/** Everything a visitor may see about a class. Null when it does not exist or is not published. */
export function classProfile(db: DB, slug: string): Promise<ClassProfile | null> {
	return asPerson(db, null, async (tx) => {
		const { rows } = await sql<ClassProfile>`
			select l.id, l.slug, l.name, l.about, l.phone_e164, l.whatsapp_e164, l.email,
				l.teaching_languages, l.age_groups, l.women_only, l.online, l.is_sample,
				l.fee_min_paise, l.fee_max_paise, l.rating_avg, l.rating_count,
				l.address_line, l.locality, l.city, l.state, l.postal_code, l.location_precise,
				st_y(l.location::geometry) as lat, st_x(l.location::geometry) as lng,
				coalesce((select json_agg(json_build_object('name', a.name, 'emoji', a.emoji, 'slug', a.slug,
						'cat', coalesce(g.slug, p.slug, a.slug)) order by a.sort)
					from org_activities oa join activity_nodes a on a.id = oa.activity_id
					left join activity_nodes p on p.id = a.parent_id
					left join activity_nodes g on g.id = p.parent_id
					where oa.org_id = l.id), '[]') as activities,
				coalesce((select array_agg(lv.color order by lv.position) from levels lv
					where lv.system_id = l.level_system_id and lv.color is not null), '{}') as level_colors,
				coalesce((select array_agg(lv.name order by lv.position) from levels lv
					where lv.system_id = l.level_system_id), '{}') as level_names,
				coalesce((select json_agg(json_build_object('id', b.id, 'name', b.name, 'days', b.days,
						'start_time', to_char(b.start_time, 'HH24:MI'), 'end_time', to_char(b.end_time, 'HH24:MI'),
						'fee_paise', b.fee_paise, 'fee_period', b.fee_period) order by b.start_time)
					from batches b where b.org_id = l.id and b.active), '[]') as batches,
				coalesce((select json_agg(r order by r.created_at desc) from (
					select rv.id, rv.rating, rv.body, rv.author_name as author,
						to_char(rv.created_at, 'YYYY-MM-DD') as created_at, rr.body as reply
					from reviews rv
					left join review_replies rr on rr.review_id = rv.id
					where rv.org_id = l.id and rv.status = 'published'
					order by rv.created_at desc limit 20) r), '[]') as reviews,
				coalesce((select json_agg(json_build_object('storage_key', ph.storage_key, 'alt_text', ph.alt_text,
						'width', ph.width, 'height', ph.height) order by (ph.storage_key = l.cover_key) desc, ph.sort)
					from photos ph where ph.org_id = l.id and ph.is_public), '[]') as photos
			from listings l
			where l.slug = ${slug}
		`.execute(tx);
		return rows[0] ?? null;
	});
}

export interface EnquiryInput {
	name: string;
	phone: string;
	message: string | null;
	forChild: boolean;
}

export function sendEnquiry(db: DB, personId: string | null, orgId: string, input: EnquiryInput) {
	return asPerson(db, personId, (tx) =>
		tx
			.insertInto('enquiries')
			.values({
				org_id: orgId,
				name: input.name,
				phone_e164: input.phone,
				message: input.message,
				for_child: input.forChild,
				person_id: personId
			})
			.execute()
	);
}

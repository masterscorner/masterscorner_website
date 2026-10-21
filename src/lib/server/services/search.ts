import { sql } from 'kysely';
import { asPerson, type DB } from '../db-core.ts';

export interface SearchInput {
	lat: number;
	lng: number;
	radiusKm?: number;
	activity?: string | null;
	q?: string | null;
	womenOnly?: boolean;
	online?: boolean;
	limit?: number;
	offset?: number;
}

export interface SearchHit {
	id: string;
	slug: string;
	name: string;
	locality: string | null;
	city: string;
	distance_m: number;
	rating_avg: string | null;
	rating_count: number;
	fee_min_paise: number | null;
	fee_max_paise: number | null;
	women_only: boolean;
	online: boolean;
	teaching_languages: string[];
	cover_key: string | null;
	activities: { name: string; emoji: string | null; cat: string }[];
	level_colors: string[];
}

/**
 * Classes near a point, nearest first. `activity` may be a category, discipline or style slug.
 * Public data only (the listings view), so it runs as a visitor.
 */
export function searchClasses(db: DB, input: SearchInput): Promise<SearchHit[]> {
	const radius = Math.min(Math.max(input.radiusKm ?? 15, 1), 100) * 1000;
	const limit = Math.min(input.limit ?? 20, 50);
	const offset = Math.max(input.offset ?? 0, 0);
	const point = sql`st_setsrid(st_makepoint(${input.lng}, ${input.lat}), 4326)::geography`;
	const activity = input.activity?.trim() || null;
	const q = input.q?.trim() || null;

	return asPerson(db, null, async (tx) => {
		const { rows } = await sql<SearchHit>`
			select l.id, l.slug, l.name, l.locality, l.city,
				round(st_distance(l.location, ${point}))::int as distance_m,
				l.rating_avg, l.rating_count, l.fee_min_paise, l.fee_max_paise,
				l.women_only, l.online, l.teaching_languages, l.cover_key,
				coalesce((
					select json_agg(json_build_object('name', a.name, 'emoji', a.emoji,
						'cat', coalesce(g.slug, p.slug, a.slug)) order by a.sort)
					from org_activities oa join activity_nodes a on a.id = oa.activity_id
					left join activity_nodes p on p.id = a.parent_id
					left join activity_nodes g on g.id = p.parent_id
					where oa.org_id = l.id
				), '[]') as activities,
				coalesce((
					select array_agg(lv.color order by lv.position)
					from levels lv where lv.system_id = l.level_system_id and lv.color is not null
				), '{}') as level_colors
			from listings l
			where st_dwithin(l.location, ${point}, ${radius})
				and (${activity}::text is null or exists (
					select 1 from org_activities oa
					join activity_nodes a on a.id = oa.activity_id
					left join activity_nodes p on p.id = a.parent_id
					left join activity_nodes g on g.id = p.parent_id
					where oa.org_id = l.id and ${activity}::text in (a.slug, p.slug, g.slug)
				))
				and (${q}::text is null or l.name ilike '%' || ${q}::text || '%' or l.locality ilike '%' || ${q}::text || '%')
				and (${input.womenOnly ?? false}::boolean = false or l.women_only)
				and (${input.online ?? false}::boolean = false or l.online)
			order by l.location <-> ${point}
			limit ${limit} offset ${offset}
		`.execute(tx);
		return rows;
	});
}

export interface ActivityOption {
	id: number;
	slug: string;
	name: string;
	emoji: string | null;
	kind: 'category' | 'discipline' | 'style';
	parent_id: number | null;
}

export function listActivities(db: DB): Promise<ActivityOption[]> {
	return asPerson(db, null, (tx) =>
		tx
			.selectFrom('activity_nodes')
			.select(['id', 'slug', 'name', 'emoji', 'kind', 'parent_id'])
			.where('status', '=', 'approved')
			.orderBy('sort')
			.execute()
	);
}

/** How many listed classes teach each category (near a point when given). Real numbers only. */
export function categoryCounts(db: DB, near?: { lat: number; lng: number; radiusKm?: number }): Promise<Record<string, number>> {
	const point = near ? sql`st_setsrid(st_makepoint(${near.lng}, ${near.lat}), 4326)::geography` : null;
	const radius = (near?.radiusKm ?? 25) * 1000;
	return asPerson(db, null, async (tx) => {
		const { rows } = await sql<{ slug: string; n: number }>`
			select coalesce(g.slug, p.slug, a.slug) as slug, count(distinct l.id)::int as n
			from listings l
			join org_activities oa on oa.org_id = l.id
			join activity_nodes a on a.id = oa.activity_id
			left join activity_nodes p on p.id = a.parent_id
			left join activity_nodes g on g.id = p.parent_id
			where ${point ? sql`st_dwithin(l.location, ${point}, ${radius})` : sql`true`}
			group by 1
		`.execute(tx);
		return Object.fromEntries(rows.map((r) => [r.slug, r.n]));
	});
}

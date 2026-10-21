-- Sample (demonstration) data is marked so it can be shown with a "Sample" tag and removed in one go
-- (npm run sample:remove).
alter table orgs add column if not exists is_sample boolean not null default false;
alter table persons add column if not exists is_sample boolean not null default false;

create or replace view listings with (security_invoker = true) as
select
	o.id, o.slug, o.name, o.about, o.country, o.currency,
	case when o.show_phone then o.phone_e164 end as phone_e164,
	case when o.show_whatsapp then o.whatsapp_e164 end as whatsapp_e164,
	case when o.show_email then o.email end as email,
	o.teaching_languages, o.age_groups, o.women_only, o.offers_trial, o.online,
	o.fee_min_paise, o.fee_max_paise, o.logo_key, o.cover_key, o.rating_avg, o.rating_count, o.level_system_id,
	b.id as branch_id, b.address_line, b.locality, b.city, b.state, b.postal_code, b.location, b.location_precise,
	o.is_sample
from orgs o
join lateral (
	select * from branches b where b.org_id = o.id order by b.created_at limit 1
) b on true
where o.status = 'published';

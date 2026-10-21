-- MastersCorner core schema.
-- Every request runs inside a transaction that does:
--   set local role app_user;
--   select set_config('app.person_id', '<uuid or empty>', true);
-- so the row-level security policies below apply as a second wall behind the app's own checks.

create extension if not exists postgis;
create extension if not exists pg_trgm;

do $$
begin
	if not exists (select from pg_roles where rolname = 'app_user') then
		create role app_user nologin;
	end if;
end
$$;

create schema if not exists app;
grant usage on schema app to app_user;
grant usage on schema public to app_user;

create or replace function app.person_id() returns uuid
language sql stable as $$
	select nullif(current_setting('app.person_id', true), '')::uuid
$$;

create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
	new.updated_at = now();
	return new;
end
$$;

-- People ------------------------------------------------------------------

create table persons (
	id uuid primary key default gen_random_uuid(),
	user_id text unique,
	display_name text not null check (char_length(display_name) between 1 and 80),
	phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
	birth_date date,
	is_minor boolean not null default false,
	created_by uuid references persons (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz
);
create unique index persons_login_phone on persons (phone_e164) where user_id is not null;
create index persons_phone on persons (phone_e164);
create trigger persons_touch before update on persons for each row execute function app.touch_updated_at();

-- Activities --------------------------------------------------------------

create table activity_nodes (
	id integer generated always as identity primary key,
	parent_id integer references activity_nodes (id),
	kind text not null check (kind in ('category', 'discipline', 'style')),
	slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
	name text not null,
	emoji text,
	sort integer not null default 0,
	status text not null default 'approved' check (status in ('approved', 'suggested', 'rejected'))
);
create index activity_nodes_parent on activity_nodes (parent_id);

-- Classes (organisations) -------------------------------------------------

create table orgs (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,60}$'),
	name text not null check (char_length(name) between 2 and 80),
	about text check (char_length(about) <= 2000),
	owner_id uuid not null references persons (id),
	country char(2) not null default 'IN',
	currency char(3) not null default 'INR',
	timezone text not null default 'Asia/Kolkata',
	phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
	show_phone boolean not null default false,
	whatsapp_e164 text check (whatsapp_e164 ~ '^\+[1-9][0-9]{6,14}$'),
	show_whatsapp boolean not null default true,
	email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
	show_email boolean not null default false,
	upi_id text check (upi_id ~ '^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64}$'),
	teaching_languages text[] not null default '{}',
	age_groups text[] not null default '{}' check (age_groups <@ array['kids', 'teens', 'adults', 'seniors']),
	women_only boolean not null default false,
	offers_trial boolean not null default true,
	online boolean not null default false,
	fee_min_paise integer check (fee_min_paise >= 0),
	fee_max_paise integer check (fee_max_paise >= fee_min_paise),
	logo_key text,
	cover_key text,
	status text not null default 'draft' check (status in ('draft', 'published', 'suspended')),
	rating_avg numeric(3, 2),
	rating_count integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index orgs_name_trgm on orgs using gin (name gin_trgm_ops);
create trigger orgs_touch before update on orgs for each row execute function app.touch_updated_at();

create table org_members (
	org_id uuid not null references orgs (id) on delete cascade,
	person_id uuid not null references persons (id) on delete cascade,
	role text not null check (role in ('owner', 'admin', 'instructor')),
	status text not null default 'active' check (status in ('invited', 'active', 'removed')),
	created_at timestamptz not null default now(),
	primary key (org_id, person_id)
);
create index org_members_person on org_members (person_id);

create table org_activities (
	org_id uuid not null references orgs (id) on delete cascade,
	activity_id integer not null references activity_nodes (id),
	primary key (org_id, activity_id)
);
create index org_activities_activity on org_activities (activity_id);

create table level_systems (
	id integer generated always as identity primary key,
	activity_id integer references activity_nodes (id),
	org_id uuid references orgs (id) on delete cascade,
	name text not null
);
create table levels (
	id integer generated always as identity primary key,
	system_id integer not null references level_systems (id) on delete cascade,
	position integer not null,
	name text not null,
	color text check (color ~ '^#[0-9a-fA-F]{6}$'),
	unique (system_id, position)
);
alter table orgs add column level_system_id integer references level_systems (id);

create table branches (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	name text not null default 'Main',
	address_line text not null check (char_length(address_line) between 3 and 200),
	locality text,
	city text not null,
	state text,
	postal_code text,
	country char(2) not null default 'IN',
	location geography(point, 4326) not null,
	-- false when the point is only the city centre (owner has not dropped a pin yet)
	location_precise boolean not null default false,
	created_at timestamptz not null default now()
);
create index branches_org on branches (org_id);
create index branches_location on branches using gist (location);

-- Who is staff, guardian, visible -----------------------------------------

create or replace function app.is_staff(p_org uuid, p_roles text[] default null) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
	select exists (
		select 1 from org_members m
		where m.org_id = p_org
			and m.person_id = app.person_id()
			and m.status = 'active'
			and (p_roles is null or m.role = any (p_roles))
	)
$$;

create table guardianships (
	id uuid primary key default gen_random_uuid(),
	child_id uuid not null references persons (id) on delete cascade,
	guardian_id uuid references persons (id) on delete cascade,
	invited_phone text check (invited_phone ~ '^\+[1-9][0-9]{6,14}$'),
	relationship text not null default 'parent' check (relationship in ('parent', 'guardian')),
	status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
	invited_by_org uuid references orgs (id) on delete set null,
	created_at timestamptz not null default now(),
	confirmed_at timestamptz,
	revoked_at timestamptz,
	check (guardian_id is not null or invited_phone is not null),
	unique (child_id, guardian_id)
);
create index guardianships_guardian on guardianships (guardian_id);
create index guardianships_phone on guardianships (invited_phone) where status = 'pending';

create or replace function app.is_guardian(p_child uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
	select exists (
		select 1 from guardianships g
		where g.child_id = p_child and g.guardian_id = app.person_id() and g.status = 'active'
	)
$$;

-- Teaching ----------------------------------------------------------------

create table batches (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	branch_id uuid references branches (id) on delete set null,
	name text not null check (char_length(name) between 1 and 60),
	activity_id integer references activity_nodes (id),
	days smallint[] not null check (days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[] and cardinality(days) between 1 and 7),
	start_time time not null,
	end_time time not null check (end_time > start_time),
	capacity integer check (capacity > 0),
	fee_paise integer check (fee_paise >= 0),
	fee_period text not null default 'month' check (fee_period in ('month', 'quarter', 'term', 'class')),
	online_url text check (online_url ~ '^https://'),
	instructor_id uuid references persons (id) on delete set null,
	active boolean not null default true,
	created_at timestamptz not null default now()
);
create index batches_org on batches (org_id);

create table class_sessions (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	batch_id uuid not null references batches (id) on delete cascade,
	on_date date not null,
	status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
	unique (batch_id, on_date)
);
create index class_sessions_org_date on class_sessions (org_id, on_date);

create table enrolments (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	batch_id uuid not null references batches (id) on delete cascade,
	person_id uuid not null references persons (id) on delete cascade,
	status text not null default 'active' check (status in ('pending_consent', 'trial', 'active', 'paused', 'left')),
	joined_on date not null default current_date,
	left_on date,
	created_by uuid references persons (id) on delete set null,
	created_at timestamptz not null default now(),
	unique (batch_id, person_id)
);
create index enrolments_person on enrolments (person_id);
create index enrolments_org on enrolments (org_id, status);

create or replace function app.can_see_person(p_person uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
	select p_person = app.person_id()
		or exists (
			select 1 from guardianships g
			where (g.status = 'active'
					and ((g.child_id = p_person and g.guardian_id = app.person_id())
						or (g.guardian_id = p_person and g.child_id = app.person_id())))
				-- an invited parent may see the child's name in order to confirm or decline
				or (g.status = 'pending' and g.child_id = p_person and g.guardian_id = app.person_id())
		)
		or exists (
			select 1 from enrolments e
			join org_members m on m.org_id = e.org_id and m.person_id = app.person_id() and m.status = 'active'
			where e.person_id = p_person
		)
		or exists (
			select 1 from org_members a
			join org_members b on b.org_id = a.org_id and b.person_id = app.person_id() and b.status = 'active'
			where a.person_id = p_person
		)
		or exists (
			select 1 from persons p
			where p.id = p_person and p.created_by = app.person_id()
		)
		or exists (
			select 1 from guardianships g
			join org_members m on m.org_id = g.invited_by_org and m.person_id = app.person_id() and m.status = 'active'
			where g.child_id = p_person
		)
$$;

create table attendance (
	id uuid primary key,
	org_id uuid not null references orgs (id) on delete cascade,
	session_id uuid not null references class_sessions (id) on delete cascade,
	person_id uuid not null references persons (id) on delete cascade,
	status text not null check (status in ('present', 'absent', 'late', 'excused')),
	method text not null default 'list' check (method in ('list', 'qr', 'online')),
	marked_by uuid references persons (id) on delete set null,
	marked_at timestamptz not null default now(),
	unique (session_id, person_id)
);
create index attendance_person on attendance (person_id, marked_at desc);
create index attendance_org_time on attendance (org_id, marked_at desc);

-- Fees --------------------------------------------------------------------

create table invoices (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	person_id uuid not null references persons (id) on delete cascade,
	batch_id uuid references batches (id) on delete set null,
	period_label text not null,
	period_start date not null,
	amount_paise integer not null check (amount_paise > 0),
	currency char(3) not null default 'INR',
	due_on date not null,
	status text not null default 'due' check (status in ('due', 'paid', 'waived', 'cancelled')),
	created_at timestamptz not null default now(),
	unique (person_id, batch_id, period_start)
);
create index invoices_org_status on invoices (org_id, status, due_on);

-- Payments are append-only: a correction is a new row with a negative amount that points at the original.
create table payments (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	invoice_id uuid references invoices (id) on delete set null,
	person_id uuid not null references persons (id) on delete cascade,
	amount_paise integer not null check (amount_paise <> 0),
	currency char(3) not null default 'INR',
	method text not null check (method in ('cash', 'upi', 'bank', 'other')),
	reference text check (char_length(reference) <= 64),
	reverses uuid references payments (id),
	recorded_by uuid references persons (id) on delete set null,
	recorded_at timestamptz not null default now()
);
create index payments_org_time on payments (org_id, recorded_at desc);

-- A student or parent says "I have paid"; staff accept (creating a payment) or reject.
create table payment_claims (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	invoice_id uuid not null references invoices (id) on delete cascade,
	claimed_by uuid not null references persons (id) on delete cascade,
	reference text check (char_length(reference) <= 64),
	status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
	created_at timestamptz not null default now(),
	decided_at timestamptz,
	decided_by uuid references persons (id) on delete set null
);

-- Public side -------------------------------------------------------------

create table photos (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	branch_id uuid references branches (id) on delete cascade,
	storage_key text not null,
	alt_text text not null check (char_length(alt_text) between 3 and 200),
	width integer,
	height integer,
	is_public boolean not null default true,
	shows_children boolean not null default false,
	sort integer not null default 0,
	created_at timestamptz not null default now(),
	check (not (is_public and shows_children))
);
create index photos_org on photos (org_id, sort);

create or replace function app.has_attended(p_org uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
	select exists (
		select 1 from attendance a
		where a.org_id = p_org and a.status in ('present', 'late')
			and (a.person_id = app.person_id() or app.is_guardian(a.person_id))
	)
$$;

create table reviews (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	author_id uuid not null references persons (id) on delete cascade,
	-- first name only, copied when the review is written (visitors cannot read persons)
	author_name text not null default '',
	rating smallint not null check (rating between 1 and 5),
	body text check (char_length(body) <= 1000),
	status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (org_id, author_id)
);
create trigger reviews_touch before update on reviews for each row execute function app.touch_updated_at();

create or replace function app.review_author_name() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
	select split_part(display_name, ' ', 1) into new.author_name from persons where id = new.author_id;
	return new;
end
$$;
create trigger reviews_author before insert on reviews for each row execute function app.review_author_name();

create table review_replies (
	review_id uuid primary key references reviews (id) on delete cascade,
	body text not null check (char_length(body) between 1 and 1000),
	replied_by uuid references persons (id) on delete set null,
	created_at timestamptz not null default now()
);

create or replace function app.refresh_org_rating() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
	target uuid := coalesce(new.org_id, old.org_id);
begin
	update orgs o set
		rating_avg = s.avg_rating,
		rating_count = s.n
	from (
		select round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as n
		from reviews where org_id = target and status = 'published'
	) s
	where o.id = target;
	return null;
end
$$;
create trigger reviews_rating after insert or update or delete on reviews
	for each row execute function app.refresh_org_rating();

create table enquiries (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	name text not null check (char_length(name) between 1 and 80),
	phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
	message text check (char_length(message) <= 500),
	for_child boolean not null default false,
	status text not null default 'new' check (status in ('new', 'contacted', 'trial_booked', 'joined', 'closed')),
	person_id uuid references persons (id) on delete set null,
	created_at timestamptz not null default now()
);
create index enquiries_org on enquiries (org_id, status, created_at desc);

create table notices (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	batch_id uuid references batches (id) on delete cascade,
	title text not null check (char_length(title) between 1 and 80),
	body text check (char_length(body) <= 1000),
	created_by uuid references persons (id) on delete set null,
	created_at timestamptz not null default now()
);
create index notices_org on notices (org_id, created_at desc);

-- Grievances and abuse reports (IT Rules 2021).
create table reports (
	id uuid primary key default gen_random_uuid(),
	target_type text not null check (target_type in ('org', 'review', 'photo', 'person', 'safety')),
	target_id uuid,
	reason text not null check (reason in ('fake', 'abusive', 'privacy', 'impersonation', 'copyright', 'child_safety', 'other')),
	details text check (char_length(details) <= 2000),
	reporter_id uuid references persons (id) on delete set null,
	reporter_phone text,
	status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'rejected')),
	created_at timestamptz not null default now(),
	acknowledged_at timestamptz,
	resolved_at timestamptz
);

-- DPDP consent records.
create table consents (
	id uuid primary key default gen_random_uuid(),
	subject_id uuid not null references persons (id) on delete cascade,
	given_by uuid not null references persons (id) on delete cascade,
	org_id uuid references orgs (id) on delete cascade,
	purpose text not null check (purpose in ('platform_account', 'class_records', 'public_profile', 'whatsapp_messages')),
	notice_version text not null,
	method text not null check (method in ('otp_self', 'otp_guardian_declaration', 'digilocker')),
	given_at timestamptz not null default now(),
	withdrawn_at timestamptz
);
create index consents_subject on consents (subject_id);

create table audit_log (
	id bigint generated always as identity primary key,
	at timestamptz not null default now(),
	actor_id uuid,
	org_id uuid,
	action text not null,
	target_type text,
	target_id uuid,
	details jsonb
);
create index audit_log_org_time on audit_log (org_id, at desc);

-- Row-level security ------------------------------------------------------

alter table persons enable row level security;
alter table activity_nodes enable row level security;
alter table orgs enable row level security;
alter table org_members enable row level security;
alter table org_activities enable row level security;
alter table level_systems enable row level security;
alter table levels enable row level security;
alter table branches enable row level security;
alter table guardianships enable row level security;
alter table batches enable row level security;
alter table class_sessions enable row level security;
alter table enrolments enable row level security;
alter table attendance enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table payment_claims enable row level security;
alter table photos enable row level security;
alter table reviews enable row level security;
alter table review_replies enable row level security;
alter table enquiries enable row level security;
alter table notices enable row level security;
alter table reports enable row level security;
alter table consents enable row level security;
alter table audit_log enable row level security;

create or replace function app.org_visible(p_org uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
	select exists (select 1 from orgs o where o.id = p_org and o.status = 'published')
		or app.is_staff(p_org)
$$;

-- persons
create policy persons_select on persons for select to app_user using (
	deleted_at is null and (id = app.person_id() or created_by = app.person_id() or app.can_see_person(id)));
create policy persons_insert on persons for insert to app_user with check (created_by = app.person_id() and user_id is null);
create policy persons_update on persons for update to app_user
	using (id = app.person_id() or app.is_guardian(id) or (user_id is null and created_by = app.person_id()))
	with check (id = app.person_id() or app.is_guardian(id) or (user_id is null and created_by = app.person_id()));

-- reference data
create policy activity_nodes_select on activity_nodes for select to app_user using (status = 'approved');
create policy activity_nodes_suggest on activity_nodes for insert to app_user with check (status = 'suggested');
create policy level_systems_select on level_systems for select to app_user using (org_id is null or app.org_visible(org_id));
create policy level_systems_write on level_systems for all to app_user
	using (org_id is not null and app.is_staff(org_id, array['owner', 'admin']))
	with check (org_id is not null and app.is_staff(org_id, array['owner', 'admin']));
create policy levels_select on levels for select to app_user using (
	exists (select 1 from level_systems s where s.id = system_id and (s.org_id is null or app.org_visible(s.org_id))));
create policy levels_write on levels for all to app_user
	using (exists (select 1 from level_systems s where s.id = system_id and s.org_id is not null and app.is_staff(s.org_id, array['owner', 'admin'])))
	with check (exists (select 1 from level_systems s where s.id = system_id and s.org_id is not null and app.is_staff(s.org_id, array['owner', 'admin'])));

-- orgs
create policy orgs_select on orgs for select to app_user using (status = 'published' or app.is_staff(id));
create policy orgs_insert on orgs for insert to app_user with check (owner_id = app.person_id() and status <> 'suspended');
create policy orgs_update on orgs for update to app_user
	using (app.is_staff(id, array['owner', 'admin']))
	with check (app.is_staff(id, array['owner', 'admin']) and status <> 'suspended');
create policy orgs_delete on orgs for delete to app_user using (app.is_staff(id, array['owner']));

create policy org_members_select on org_members for select to app_user using (person_id = app.person_id() or app.is_staff(org_id));
-- The very first owner row is written by the server with the owner role; after that, owners/admins manage staff.
create policy org_members_write on org_members for all to app_user
	using (app.is_staff(org_id, array['owner', 'admin']))
	with check (app.is_staff(org_id, array['owner', 'admin']) and (role <> 'owner' or app.is_staff(org_id, array['owner'])));

create policy org_activities_select on org_activities for select to app_user using (app.org_visible(org_id));
create policy org_activities_write on org_activities for all to app_user
	using (app.is_staff(org_id, array['owner', 'admin'])) with check (app.is_staff(org_id, array['owner', 'admin']));

create policy branches_select on branches for select to app_user using (app.org_visible(org_id));
create policy branches_write on branches for all to app_user
	using (app.is_staff(org_id, array['owner', 'admin'])) with check (app.is_staff(org_id, array['owner', 'admin']));

-- guardianships
create policy guardianships_select on guardianships for select to app_user using (
	guardian_id = app.person_id() or child_id = app.person_id()
	or (invited_by_org is not null and app.is_staff(invited_by_org)));
create policy guardianships_insert on guardianships for insert to app_user with check (
	(guardian_id = app.person_id() and status in ('pending', 'active'))
	or (guardian_id is null and status = 'pending' and invited_by_org is not null and app.is_staff(invited_by_org, array['owner', 'admin', 'instructor'])));
create policy guardianships_update on guardianships for update to app_user
	using (guardian_id = app.person_id()) with check (guardian_id = app.person_id());

-- teaching
create policy batches_select on batches for select to app_user using (app.org_visible(org_id));
create policy batches_write on batches for all to app_user
	using (app.is_staff(org_id, array['owner', 'admin'])) with check (app.is_staff(org_id, array['owner', 'admin']));

create policy class_sessions_select on class_sessions for select to app_user using (
	app.is_staff(org_id)
	or exists (select 1 from enrolments e where e.batch_id = class_sessions.batch_id
		and (e.person_id = app.person_id() or app.is_guardian(e.person_id))));
create policy class_sessions_write on class_sessions for all to app_user
	using (app.is_staff(org_id)) with check (app.is_staff(org_id));

create policy enrolments_select on enrolments for select to app_user using (
	app.is_staff(org_id) or person_id = app.person_id() or app.is_guardian(person_id));
create policy enrolments_write on enrolments for all to app_user
	using (app.is_staff(org_id, array['owner', 'admin'])) with check (app.is_staff(org_id, array['owner', 'admin']));

create policy attendance_select on attendance for select to app_user using (
	app.is_staff(org_id) or person_id = app.person_id() or app.is_guardian(person_id));
create policy attendance_insert on attendance for insert to app_user with check (
	app.is_staff(org_id) and marked_by = app.person_id()
	and exists (select 1 from class_sessions s where s.id = session_id and s.org_id = attendance.org_id));
create policy attendance_update on attendance for update to app_user
	using (app.is_staff(org_id)) with check (app.is_staff(org_id) and marked_by = app.person_id());

-- fees: instructors do not see money
create policy invoices_select on invoices for select to app_user using (
	app.is_staff(org_id, array['owner', 'admin']) or person_id = app.person_id() or app.is_guardian(person_id));
create policy invoices_write on invoices for all to app_user
	using (app.is_staff(org_id, array['owner', 'admin'])) with check (app.is_staff(org_id, array['owner', 'admin']));

create policy payments_select on payments for select to app_user using (
	app.is_staff(org_id, array['owner', 'admin']) or person_id = app.person_id() or app.is_guardian(person_id));
create policy payments_insert on payments for insert to app_user with check (
	app.is_staff(org_id, array['owner', 'admin']) and recorded_by = app.person_id());

create policy payment_claims_select on payment_claims for select to app_user using (
	app.is_staff(org_id, array['owner', 'admin']) or claimed_by = app.person_id());
create policy payment_claims_insert on payment_claims for insert to app_user with check (
	claimed_by = app.person_id() and status = 'pending'
	and exists (select 1 from invoices i where i.id = invoice_id and i.org_id = payment_claims.org_id
		and (i.person_id = app.person_id() or app.is_guardian(i.person_id))));
create policy payment_claims_decide on payment_claims for update to app_user
	using (app.is_staff(org_id, array['owner', 'admin'])) with check (app.is_staff(org_id, array['owner', 'admin']));

-- public side
create policy photos_select on photos for select to app_user using (
	(is_public and exists (select 1 from orgs o where o.id = org_id and o.status = 'published')) or app.is_staff(org_id));
create policy photos_write on photos for all to app_user
	using (app.is_staff(org_id, array['owner', 'admin'])) with check (app.is_staff(org_id, array['owner', 'admin']));

create policy reviews_select on reviews for select to app_user using (
	status = 'published' or author_id = app.person_id() or app.is_staff(org_id));
create policy reviews_insert on reviews for insert to app_user with check (
	author_id = app.person_id() and status = 'published' and app.has_attended(org_id) and not app.is_staff(org_id));
create policy reviews_update on reviews for update to app_user
	using (author_id = app.person_id()) with check (author_id = app.person_id() and status = 'published');

create policy review_replies_select on review_replies for select to app_user using (
	exists (select 1 from reviews r where r.id = review_id and (r.status = 'published' or app.is_staff(r.org_id))));
create policy review_replies_write on review_replies for all to app_user
	using (exists (select 1 from reviews r where r.id = review_id and app.is_staff(r.org_id, array['owner', 'admin'])))
	with check (replied_by = app.person_id() and exists (select 1 from reviews r where r.id = review_id and app.is_staff(r.org_id, array['owner', 'admin'])));

create policy enquiries_insert on enquiries for insert to app_user with check (
	status = 'new' and exists (select 1 from orgs o where o.id = org_id and o.status = 'published'));
create policy enquiries_select on enquiries for select to app_user using (app.is_staff(org_id, array['owner', 'admin']) or person_id = app.person_id());
create policy enquiries_update on enquiries for update to app_user
	using (app.is_staff(org_id, array['owner', 'admin'])) with check (app.is_staff(org_id, array['owner', 'admin']));

create policy notices_select on notices for select to app_user using (
	app.is_staff(org_id)
	or exists (select 1 from enrolments e where e.org_id = notices.org_id
		and (notices.batch_id is null or e.batch_id = notices.batch_id)
		and (e.person_id = app.person_id() or app.is_guardian(e.person_id))));
create policy notices_write on notices for all to app_user
	using (app.is_staff(org_id)) with check (app.is_staff(org_id) and created_by = app.person_id());

create policy reports_insert on reports for insert to app_user with check (
	status = 'open' and (reporter_id is null or reporter_id = app.person_id()));
create policy reports_select on reports for select to app_user using (reporter_id = app.person_id());

create policy consents_select on consents for select to app_user using (
	subject_id = app.person_id() or given_by = app.person_id() or (org_id is not null and app.is_staff(org_id)));
create policy consents_insert on consents for insert to app_user with check (
	given_by = app.person_id() and (subject_id = app.person_id() or app.is_guardian(subject_id)));
create policy consents_withdraw on consents for update to app_user
	using (given_by = app.person_id()) with check (given_by = app.person_id());

create policy audit_log_insert on audit_log for insert to app_user with check (actor_id = app.person_id());

-- Creating a class makes the creator its owner in one step (the org row is not visible to them until they are staff).
create or replace function app.create_org(p_slug text, p_name text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
	me uuid := app.person_id();
	new_id uuid;
begin
	if me is null then
		raise exception 'not signed in' using errcode = '42501';
	end if;
	insert into orgs (slug, name, owner_id) values (p_slug, p_name, me) returning id into new_id;
	insert into org_members (org_id, person_id, role) values (new_id, me, 'owner');
	insert into audit_log (actor_id, org_id, action, target_type, target_id) values (me, new_id, 'org.create', 'org', new_id);
	return new_id;
end
$$;

-- Table privileges for the request role. Payments and audit log are append-only.
grant select, insert, update on persons to app_user;
grant select, insert on activity_nodes to app_user;
grant select, insert, update, delete on orgs, org_members, org_activities, level_systems, levels, branches,
	guardianships, batches, class_sessions, enrolments, invoices, photos, reviews, review_replies, notices to app_user;
grant select, insert, update on attendance, payment_claims, enquiries, consents to app_user;
grant select, insert on payments, reports to app_user;
grant insert on audit_log to app_user;
grant usage on all sequences in schema public to app_user;
grant execute on all functions in schema app to app_user;

-- Public listing: only what a visitor may see. Hidden contact fields come back as null.
create view listings with (security_invoker = true) as
select
	o.id, o.slug, o.name, o.about, o.country, o.currency,
	case when o.show_phone then o.phone_e164 end as phone_e164,
	case when o.show_whatsapp then o.whatsapp_e164 end as whatsapp_e164,
	case when o.show_email then o.email end as email,
	o.teaching_languages, o.age_groups, o.women_only, o.offers_trial, o.online,
	o.fee_min_paise, o.fee_max_paise, o.logo_key, o.cover_key, o.rating_avg, o.rating_count, o.level_system_id,
	b.id as branch_id, b.address_line, b.locality, b.city, b.state, b.postal_code, b.location, b.location_precise
from orgs o
join lateral (
	select * from branches b where b.org_id = o.id order by b.created_at limit 1
) b on true
where o.status = 'published';
grant select on listings to app_user;

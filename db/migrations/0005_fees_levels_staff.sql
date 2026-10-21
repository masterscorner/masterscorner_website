-- Fees settings, level awards (gradings), staff invitations, enquiry notes.

alter table orgs add column fee_due_day smallint not null default 10 check (fee_due_day between 1 and 28);

alter table enquiries add column note text check (char_length(note) <= 500);
alter table enquiries add column updated_at timestamptz not null default now();
create trigger enquiries_touch before update on enquiries for each row execute function app.touch_updated_at();

-- Level awards: who gave which level to whom, when. Never edited; a mistake is revoked and a new award added.
create table grade_awards (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	person_id uuid not null references persons (id) on delete cascade,
	level_id integer not null references levels (id),
	awarded_on date not null default current_date,
	awarded_by uuid references persons (id) on delete set null,
	note text check (char_length(note) <= 300),
	revoked_at timestamptz,
	revoked_by uuid references persons (id) on delete set null,
	created_at timestamptz not null default now()
);
create index grade_awards_person on grade_awards (person_id, awarded_on desc);
create index grade_awards_org on grade_awards (org_id, awarded_on desc);
alter table grade_awards enable row level security;

create policy grade_awards_select on grade_awards for select to app_user using (
	app.is_staff(org_id) or person_id = app.person_id() or app.is_guardian(person_id));
create policy grade_awards_insert on grade_awards for insert to app_user with check (
	app.is_staff(org_id) and awarded_by = app.person_id() and revoked_at is null
	and exists (select 1 from enrolments e where e.org_id = grade_awards.org_id and e.person_id = grade_awards.person_id));
create policy grade_awards_revoke on grade_awards for update to app_user
	using (app.is_staff(org_id, array['owner', 'admin']))
	with check (app.is_staff(org_id, array['owner', 'admin']) and revoked_by = app.person_id());
grant select, insert, update on grade_awards to app_user;

-- Staff invitations by phone number. The invited person accepts after signing in with that number.
create table staff_invites (
	id uuid primary key default gen_random_uuid(),
	org_id uuid not null references orgs (id) on delete cascade,
	phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
	role text not null check (role in ('admin', 'instructor')),
	invited_by uuid references persons (id) on delete set null,
	created_at timestamptz not null default now(),
	accepted_at timestamptz,
	revoked_at timestamptz
);
create unique index staff_invites_open on staff_invites (org_id, phone_e164) where accepted_at is null and revoked_at is null;
alter table staff_invites enable row level security;
create policy staff_invites_manage on staff_invites for all to app_user
	using (app.is_staff(org_id, array['owner', 'admin']))
	with check (app.is_staff(org_id, array['owner', 'admin']) and invited_by = app.person_id());
grant select, insert, update on staff_invites to app_user;

-- Invitations waiting for the signed-in person (matched on their verified phone).
create or replace function app.my_staff_invites() returns table (id uuid, org_id uuid, org_name text, role text)
language sql stable security definer set search_path = public, pg_temp as $$
	select i.id, i.org_id, o.name, i.role
	from staff_invites i
	join orgs o on o.id = i.org_id
	join persons p on p.id = app.person_id() and p.phone_e164 = i.phone_e164 and p.user_id is not null
	where i.accepted_at is null and i.revoked_at is null
$$;

create or replace function app.accept_staff_invite(p_id uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
	me uuid := app.person_id();
	inv staff_invites%rowtype;
begin
	select i.* into inv from staff_invites i
	join persons p on p.id = me and p.phone_e164 = i.phone_e164 and p.user_id is not null
	where i.id = p_id and i.accepted_at is null and i.revoked_at is null
	for update of i;
	if inv.id is null then
		raise exception 'invitation not found' using errcode = '42501';
	end if;
	update staff_invites set accepted_at = now() where id = p_id;
	insert into org_members (org_id, person_id, role, status) values (inv.org_id, me, inv.role, 'active')
	on conflict (org_id, person_id) do update set role = excluded.role, status = 'active'
		where org_members.role <> 'owner';
	insert into audit_log (actor_id, org_id, action, target_type, target_id) values (me, inv.org_id, 'staff.accept', 'person', me);
	return inv.org_id;
end
$$;
grant execute on function app.my_staff_invites() to app_user;
grant execute on function app.accept_staff_invite(uuid) to app_user;

-- Staff can read the names of their fellow staff (for the staff list).
create or replace function app.staff_list(p_org uuid) returns table (person_id uuid, display_name text, phone_e164 text, role text, status text)
language sql stable security definer set search_path = public, pg_temp as $$
	select m.person_id, p.display_name, p.phone_e164, m.role, m.status
	from org_members m join persons p on p.id = m.person_id
	where m.org_id = p_org and app.is_staff(p_org)
	order by case m.role when 'owner' then 0 when 'admin' then 1 else 2 end, p.display_name
$$;
grant execute on function app.staff_list(uuid) to app_user;

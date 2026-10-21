-- Parent confirms (or declines) a child that a class added. This is the verifiable-consent step:
-- the parent is signed in with a verified phone that matches the invitation, is an adult by
-- their own declaration, and gives consent for the class to keep the child's records.

create or replace function app.confirm_guardianship(p_id uuid, p_notice_version text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
	me uuid := app.person_id();
	g guardianships%rowtype;
	my_birth date;
begin
	select * into g from guardianships where id = p_id for update;
	if g.id is null or g.guardian_id is distinct from me or g.status <> 'pending' then
		raise exception 'invitation not found' using errcode = '42501';
	end if;
	select birth_date into my_birth from persons where id = me;
	if my_birth is null or my_birth > (current_date - interval '18 years') then
		raise exception 'only an adult can confirm' using errcode = '42501';
	end if;

	update guardianships set status = 'active', confirmed_at = now() where id = p_id;
	insert into consents (subject_id, given_by, org_id, purpose, notice_version, method)
		values (g.child_id, me, g.invited_by_org, 'class_records', p_notice_version, 'otp_guardian_declaration');
	update enrolments set status = 'active'
		where person_id = g.child_id and status = 'pending_consent'
			and (g.invited_by_org is null or org_id = g.invited_by_org);
	insert into audit_log (actor_id, org_id, action, target_type, target_id)
		values (me, g.invited_by_org, 'guardian.confirm', 'person', g.child_id);
end
$$;

-- Declining removes the child's record entirely (nothing is kept without consent).
create or replace function app.decline_guardianship(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
	me uuid := app.person_id();
	g guardianships%rowtype;
begin
	select * into g from guardianships where id = p_id for update;
	if g.id is null or g.guardian_id is distinct from me or g.status <> 'pending' then
		raise exception 'invitation not found' using errcode = '42501';
	end if;
	insert into audit_log (actor_id, org_id, action, target_type, target_id)
		values (me, g.invited_by_org, 'guardian.decline', 'person', g.child_id);
	-- Only delete if no other guardian has already confirmed this child.
	if not exists (select 1 from guardianships o where o.child_id = g.child_id and o.status = 'active') then
		delete from persons where id = g.child_id and user_id is null;
	else
		update guardianships set status = 'revoked', revoked_at = now() where id = p_id;
	end if;
end
$$;

-- Children whose parent never answers are removed after 30 days (scheduled job runs this).
create or replace function app.purge_unconfirmed_children() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
	n integer;
begin
	with gone as (
		delete from persons p
		where p.is_minor and p.user_id is null and p.created_at < now() - interval '30 days'
			and not exists (select 1 from guardianships g where g.child_id = p.id and g.status = 'active')
		returning 1
	)
	select count(*) into n from gone;
	return n;
end
$$;

grant execute on function app.confirm_guardianship(uuid, text) to app_user;
grant execute on function app.decline_guardianship(uuid) to app_user;
revoke execute on function app.purge_unconfirmed_children() from public, app_user;

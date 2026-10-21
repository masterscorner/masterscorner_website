-- Ready for hosted Postgres (Supabase and others).

-- 1. Login tables live in our own schema "mc_auth". Supabase reserves the "auth" schema for itself,
--    so older local databases that used "auth" are moved over.
do $$
begin
	if exists (select from information_schema.tables where table_schema = 'auth' and table_name = 'user')
		and not exists (select from pg_namespace where nspname = 'mc_auth') then
		execute 'alter schema auth rename to mc_auth';
	end if;
end
$$;

-- 2. The server connects as a normal (non-superuser) login on hosted Postgres and switches to
--    app_user inside each request; that needs explicit membership on Postgres 16+.
do $$
begin
	execute format('grant app_user to %I', current_user);
exception when others then
	null; -- already a member, or a superuser (local)
end
$$;

-- 3. Supabase also exposes the public schema through its own web API (anon/authenticated roles).
--    We don't use that API: remove its access so only our server can read data.
do $$
declare r text;
begin
	foreach r in array array['anon', 'authenticated'] loop
		if exists (select from pg_roles where rolname = r) then
			execute format('revoke all on all tables in schema public from %I', r);
			execute format('revoke all on all sequences in schema public from %I', r);
			execute format('revoke all on all functions in schema public from %I', r);
			execute format('alter default privileges in schema public revoke all on tables from %I', r);
			execute format('alter default privileges in schema public revoke all on sequences from %I', r);
			execute format('alter default privileges in schema public revoke all on functions from %I', r);
		end if;
	end loop;
end
$$;

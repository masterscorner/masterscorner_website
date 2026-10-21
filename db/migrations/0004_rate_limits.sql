-- Fixed-window rate limits (login codes, enquiries, reports). Shared by every server instance.
create table rate_limits (
	key text primary key,
	window_start timestamptz not null,
	hits integer not null
);

-- Returns true when the action is allowed, false when the limit is reached.
create or replace function app.rate_limit(p_key text, p_max integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
	allowed boolean;
begin
	insert into rate_limits as r (key, window_start, hits)
	values (p_key, now(), 1)
	on conflict (key) do update set
		window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
		hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end
	returning hits <= p_max into allowed;
	return allowed;
end
$$;
grant execute on function app.rate_limit(text, integer, integer) to app_user;

-- Old windows are cleaned up by the scheduled job.
create or replace function app.purge_rate_limits() returns void
language sql security definer set search_path = public, pg_temp as $$
	delete from rate_limits where window_start < now() - interval '1 day'
$$;
revoke execute on function app.purge_rate_limits() from public, app_user;

-- Global cost guard for the anonymous demo and stricter recorded isolation
-- metadata. Per-fingerprint limits alone do not bound a distributed caller.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.fc_demo_global_rate_limit (
  singleton boolean primary key default true check (singleton),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

revoke all on table private.fc_demo_global_rate_limit
  from public, anon, authenticated;

create or replace function public.consume_fc_demo_quota(
  p_fingerprint_hash text
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_per_fingerprint_limit integer := 4;
  v_global_limit integer := 40;
  v_window interval := interval '1 hour';
  v_now timestamptz := clock_timestamp();
  v_row private.fc_demo_rate_limits%rowtype;
  v_global private.fc_demo_global_rate_limit%rowtype;
begin
  if p_fingerprint_hash !~ '^[a-f0-9]{64}$' then
    raise invalid_parameter_value using message = 'Invalid fingerprint';
  end if;

  insert into private.fc_demo_rate_limits (
    fingerprint_hash,
    window_started_at,
    request_count
  )
  values (p_fingerprint_hash, v_now, 1)
  on conflict (fingerprint_hash) do update
  set
    window_started_at = case
      when private.fc_demo_rate_limits.window_started_at <= v_now - v_window
        then v_now
      else private.fc_demo_rate_limits.window_started_at
    end,
    request_count = case
      when private.fc_demo_rate_limits.window_started_at <= v_now - v_window
        then 1
      else private.fc_demo_rate_limits.request_count + 1
    end
  returning * into v_row;

  if v_row.request_count > v_per_fingerprint_limit then
    return query
    select
      false,
      greatest(
        1,
        ceil(extract(epoch from (
          v_row.window_started_at + v_window - v_now
        )))::integer
      );
    return;
  end if;

  insert into private.fc_demo_global_rate_limit (
    singleton,
    window_started_at,
    request_count
  )
  values (true, v_now, 1)
  on conflict (singleton) do update
  set
    window_started_at = case
      when private.fc_demo_global_rate_limit.window_started_at
        <= v_now - v_window
        then v_now
      else private.fc_demo_global_rate_limit.window_started_at
    end,
    request_count = case
      when private.fc_demo_global_rate_limit.window_started_at
        <= v_now - v_window
        then 1
      else private.fc_demo_global_rate_limit.request_count + 1
    end
  returning * into v_global;

  return query
  select
    v_global.request_count <= v_global_limit,
    case
      when v_global.request_count <= v_global_limit then 0
      else greatest(
        1,
        ceil(extract(epoch from (
          v_global.window_started_at + v_window - v_now
        )))::integer
      )
    end;
end;
$$;

revoke all on function public.consume_fc_demo_quota(text)
  from public, anon, authenticated;
grant execute on function public.consume_fc_demo_quota(text)
  to service_role;

update public.fc_capability_evidence
set metrics = metrics || '{
  "isolationLevel": "virtual_machine",
  "separateSessionIds": true
}'::jsonb
where capability = 'strong_isolation'
  and status = 'verified'
  and source =
    'docs/fc-sandbox/LIVE_EVIDENCE_2026-07-29.md#strong-isolation-probe';

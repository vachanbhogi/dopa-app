-- Evidence-backed competitor intelligence schema.
-- Browser clients can read their own research data. All worker writes use the
-- server-only Supabase secret after a signed callback has been verified.

alter table public.competitors
  add column if not exists candidate_id uuid,
  add column if not exists normalized_domain text,
  add column if not exists relationship text,
  add column if not exists threat_score integer,
  add column if not exists confidence integer,
  add column if not exists threat_horizon text,
  add column if not exists why_now text;

alter table public.competitors
  drop constraint if exists competitors_relationship_check,
  add constraint competitors_relationship_check
    check (relationship is null or relationship in ('direct', 'indirect', 'emerging')),
  drop constraint if exists competitors_threat_score_check,
  add constraint competitors_threat_score_check
    check (threat_score is null or threat_score between 0 and 100),
  drop constraint if exists competitors_confidence_check,
  add constraint competitors_confidence_check
    check (confidence is null or confidence between 0 and 100),
  drop constraint if exists competitors_threat_horizon_check,
  add constraint competitors_threat_horizon_check
    check (
      threat_horizon is null
      or threat_horizon in ('now', 'next_6_months', 'next_12_months')
    );

create unique index if not exists competitors_business_domain_unique_idx
  on public.competitors (business_id, normalized_domain)
  where normalized_domain is not null;

create table if not exists public.competitor_research_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  trigger text not null check (trigger in ('manual', 'scheduled')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  stage text not null default 'queued'
    check (stage in ('queued', 'searching', 'synthesizing', 'finalizing', 'completed', 'failed')),
  input_snapshot jsonb not null default '{}'::jsonb,
  model_id text,
  provider_request_id text,
  source_count integer not null default 0 check (source_count >= 0),
  error_code text,
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competitor_research_one_active_business_idx
  on public.competitor_research_runs (business_id)
  where status in ('queued', 'running');

create index if not exists competitor_research_runs_business_created_idx
  on public.competitor_research_runs (business_id, created_at desc);

create table if not exists public.competitor_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.competitor_research_runs (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  website_url text not null,
  normalized_domain text not null,
  relationship text not null check (relationship in ('direct', 'indirect', 'emerging')),
  threat_score integer not null check (threat_score between 0 and 100),
  confidence integer not null check (confidence between 0 and 100),
  threat_horizon text not null
    check (threat_horizon in ('now', 'next_6_months', 'next_12_months')),
  why_competitor text not null,
  why_now text not null,
  customer_overlap integer not null check (customer_overlap between 0 and 100),
  product_substitutability integer not null check (product_substitutability between 0 and 100),
  momentum integer not null check (momentum between 0 and 100),
  distribution_overlap integer not null check (distribution_overlap between 0 and 100),
  evidence_quality integer not null check (evidence_quality between 0 and 100),
  rank integer not null check (rank between 1 and 10),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (run_id, normalized_domain),
  unique (run_id, rank)
);

alter table public.competitors
  drop constraint if exists competitors_candidate_id_fkey,
  add constraint competitors_candidate_id_fkey
    foreign key (candidate_id)
    references public.competitor_candidates (id)
    on delete set null;

create index if not exists competitor_candidates_business_run_idx
  on public.competitor_candidates (business_id, run_id, rank);

create table if not exists public.competitor_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.competitor_candidates (id) on delete cascade,
  run_id uuid not null references public.competitor_research_runs (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  source_url text not null,
  source_domain text not null,
  title text not null,
  source_type text not null
    check (source_type in ('official', 'news', 'review', 'directory', 'social', 'other')),
  claim text not null,
  excerpt text not null,
  published_at timestamptz,
  observed_at timestamptz not null default now(),
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (candidate_id, source_url, content_hash)
);

create index if not exists competitor_evidence_candidate_idx
  on public.competitor_evidence (candidate_id, observed_at desc);

create table if not exists public.competitor_monitor_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  enabled boolean not null default false,
  cadence text not null default 'daily' check (cadence = 'daily'),
  local_time time not null default '08:00',
  timezone text not null default 'America/Los_Angeles',
  min_alert_score integer not null default 70 check (min_alert_score between 0 and 100),
  notify_in_app boolean not null default true,
  notify_browser boolean not null default false,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competitor_monitor_settings_due_idx
  on public.competitor_monitor_settings (next_run_at)
  where enabled = true;

create table if not exists public.competitor_alerts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  run_id uuid references public.competitor_research_runs (id) on delete cascade,
  candidate_id uuid references public.competitor_candidates (id) on delete set null,
  kind text not null
    check (kind in ('new_competitor', 'threat_increase', 'new_signal', 'research_failed')),
  severity text not null check (severity in ('low', 'medium', 'high')),
  title text not null,
  body text not null,
  dedupe_key text not null unique,
  read_at timestamptz,
  push_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists competitor_alerts_business_created_idx
  on public.competitor_alerts (business_id, created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

create table if not exists public.competitor_workers (
  worker_id text primary key,
  status text not null check (status in ('starting', 'healthy', 'degraded')),
  version text not null,
  queue_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_request_nonces (
  nonce text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists internal_request_nonces_expiry_idx
  on public.internal_request_nonces (expires_at);

alter table public.competitor_moves
  add column if not exists business_id uuid references public.businesses (id) on delete cascade,
  add column if not exists research_run_id uuid references public.competitor_research_runs (id) on delete cascade,
  add column if not exists source_url text,
  add column if not exists source_title text,
  add column if not exists signal_date timestamptz,
  add column if not exists observed_at timestamptz not null default now(),
  add column if not exists confidence integer,
  add column if not exists dedupe_key text;

alter table public.competitor_moves
  drop constraint if exists competitor_moves_confidence_check,
  add constraint competitor_moves_confidence_check
    check (confidence is null or confidence between 0 and 100);

create unique index if not exists competitor_moves_dedupe_idx
  on public.competitor_moves (dedupe_key)
  where dedupe_key is not null;

create index if not exists competitor_moves_competitor_observed_idx
  on public.competitor_moves (competitor_id, observed_at desc);

alter table public.competitor_research_runs enable row level security;
alter table public.competitor_candidates enable row level security;
alter table public.competitor_evidence enable row level security;
alter table public.competitor_monitor_settings enable row level security;
alter table public.competitor_alerts enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.competitor_workers enable row level security;
alter table public.internal_request_nonces enable row level security;

drop policy if exists "Users can manage competitors of their businesses" on public.competitors;
drop policy if exists "Users can manage moves of their competitors" on public.competitor_moves;

create policy "Users can view competitors of own businesses"
  on public.competitors for select to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = competitors.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can insert competitors for own businesses"
  on public.competitors for insert to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = competitors.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can update competitors of own businesses"
  on public.competitors for update to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = competitors.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = competitors.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can delete competitors of own businesses"
  on public.competitors for delete to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = competitors.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can view moves of own competitors"
  on public.competitor_moves for select to authenticated
  using (
    exists (
      select 1
      from public.competitors c
      join public.businesses b on b.id = c.business_id
      where c.id = competitor_moves.competitor_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can view own research runs"
  on public.competitor_research_runs for select to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = competitor_research_runs.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can view own competitor candidates"
  on public.competitor_candidates for select to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = competitor_candidates.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can view own competitor evidence"
  on public.competitor_evidence for select to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = competitor_evidence.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can view own monitor settings"
  on public.competitor_monitor_settings for select to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = competitor_monitor_settings.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can insert own monitor settings"
  on public.competitor_monitor_settings for insert to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = competitor_monitor_settings.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can update own monitor settings"
  on public.competitor_monitor_settings for update to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = competitor_monitor_settings.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = competitor_monitor_settings.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can view own competitor alerts"
  on public.competitor_alerts for select to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = competitor_alerts.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.competitor_research_runs from anon, authenticated;
revoke all on table public.competitor_candidates from anon, authenticated;
revoke all on table public.competitor_evidence from anon, authenticated;
revoke all on table public.competitor_monitor_settings from anon, authenticated;
revoke all on table public.competitor_alerts from anon, authenticated;
revoke all on table public.push_subscriptions from anon, authenticated;
revoke all on table public.competitor_workers from anon, authenticated;
revoke all on table public.internal_request_nonces from anon, authenticated;

grant select on table public.competitor_research_runs to authenticated;
grant select on table public.competitor_candidates to authenticated;
grant select on table public.competitor_evidence to authenticated;
grant select, insert, update on table public.competitor_monitor_settings to authenticated;
grant select on table public.competitor_alerts to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

grant select, insert, update, delete on table public.competitor_research_runs to service_role;
grant select, insert, update, delete on table public.competitor_candidates to service_role;
grant select, insert, update, delete on table public.competitor_evidence to service_role;
grant select, insert, update, delete on table public.competitor_monitor_settings to service_role;
grant select, insert, update, delete on table public.competitor_alerts to service_role;
grant select, insert, update, delete on table public.push_subscriptions to service_role;
grant select, insert, update, delete on table public.competitor_workers to service_role;
grant select, insert, update, delete on table public.internal_request_nonces to service_role;

-- Existing tables were created before explicit Data API grants became the
-- platform default, so keep their intended authenticated access explicit.
grant select, insert, update, delete on table public.competitors to authenticated, service_role;
grant select on table public.competitor_moves to authenticated;
grant select, insert, update, delete on table public.competitor_moves to service_role;

-- Persist a complete worker report in one database transaction. The function
-- remains security-invoker and executable only by the server-side service role.
create or replace function public.complete_competitor_research(
  p_run_id uuid,
  p_model_id text,
  p_provider_request_id text,
  p_source_count integer,
  p_completed_at timestamptz,
  p_candidates jsonb,
  p_signals jsonb,
  p_alerts jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_run public.competitor_research_runs%rowtype;
  v_candidate jsonb;
  v_candidate_id uuid;
  v_evidence jsonb;
  v_signal jsonb;
  v_alert jsonb;
  v_alert_id uuid;
  v_alert_ids uuid[] := array[]::uuid[];
begin
  select *
    into v_run
    from public.competitor_research_runs
    where id = p_run_id
    for update;

  if not found then
    raise exception 'Research run not found.';
  end if;

  if v_run.status = 'completed' then
    return jsonb_build_object(
      'idempotent', true,
      'candidate_count', 0,
      'signal_count', 0,
      'alert_ids', '[]'::jsonb
    );
  end if;

  delete from public.competitor_moves where research_run_id = p_run_id;
  delete from public.competitor_candidates where run_id = p_run_id;

  for v_candidate in
    select value from jsonb_array_elements(coalesce(p_candidates, '[]'::jsonb))
  loop
    insert into public.competitor_candidates (
      run_id,
      business_id,
      name,
      website_url,
      normalized_domain,
      relationship,
      threat_score,
      confidence,
      threat_horizon,
      why_competitor,
      why_now,
      customer_overlap,
      product_substitutability,
      momentum,
      distribution_overlap,
      evidence_quality,
      rank,
      last_seen_at
    )
    values (
      p_run_id,
      v_run.business_id,
      v_candidate ->> 'name',
      v_candidate ->> 'website_url',
      v_candidate ->> 'normalized_domain',
      v_candidate ->> 'relationship',
      (v_candidate ->> 'threat_score')::integer,
      (v_candidate ->> 'confidence')::integer,
      v_candidate ->> 'threat_horizon',
      v_candidate ->> 'why_competitor',
      v_candidate ->> 'why_now',
      (v_candidate #>> '{components,customer_overlap}')::integer,
      (v_candidate #>> '{components,product_substitutability}')::integer,
      (v_candidate #>> '{components,momentum}')::integer,
      (v_candidate #>> '{components,distribution_overlap}')::integer,
      (v_candidate #>> '{components,evidence_quality}')::integer,
      (v_candidate ->> 'rank')::integer,
      p_completed_at
    )
    returning id into v_candidate_id;

    for v_evidence in
      select value
        from jsonb_array_elements(
          coalesce(v_candidate -> 'evidence', '[]'::jsonb)
        )
    loop
      insert into public.competitor_evidence (
        candidate_id,
        run_id,
        business_id,
        source_url,
        source_domain,
        title,
        source_type,
        claim,
        excerpt,
        published_at,
        observed_at,
        content_hash
      )
      values (
        v_candidate_id,
        p_run_id,
        v_run.business_id,
        v_evidence ->> 'source_url',
        v_evidence ->> 'source_domain',
        v_evidence ->> 'title',
        v_evidence ->> 'source_type',
        v_evidence ->> 'claim',
        v_evidence ->> 'excerpt',
        nullif(v_evidence ->> 'published_at', '')::timestamptz,
        (v_evidence ->> 'observed_at')::timestamptz,
        v_evidence ->> 'content_hash'
      );
    end loop;
  end loop;

  for v_signal in
    select value from jsonb_array_elements(coalesce(p_signals, '[]'::jsonb))
  loop
    if exists (
      select 1
        from public.competitors
        where id = (v_signal ->> 'competitor_id')::uuid
          and business_id = v_run.business_id
    ) then
      insert into public.competitor_moves (
        competitor_id,
        business_id,
        research_run_id,
        move_type,
        title,
        description,
        risk_level,
        source_url,
        source_title,
        signal_date,
        observed_at,
        confidence,
        dedupe_key
      )
      values (
        (v_signal ->> 'competitor_id')::uuid,
        v_run.business_id,
        p_run_id,
        v_signal ->> 'move_type',
        v_signal ->> 'title',
        v_signal ->> 'description',
        v_signal ->> 'risk_level',
        v_signal ->> 'source_url',
        v_signal ->> 'source_title',
        nullif(v_signal ->> 'signal_date', '')::timestamptz,
        (v_signal ->> 'observed_at')::timestamptz,
        (v_signal ->> 'confidence')::integer,
        v_signal ->> 'dedupe_key'
      )
      on conflict (dedupe_key) where dedupe_key is not null do nothing;
    end if;
  end loop;

  for v_alert in
    select value from jsonb_array_elements(coalesce(p_alerts, '[]'::jsonb))
  loop
    v_candidate_id := null;
    v_alert_id := null;
    if nullif(v_alert ->> 'candidate_domain', '') is not null then
      select id
        into v_candidate_id
        from public.competitor_candidates
        where run_id = p_run_id
          and normalized_domain = v_alert ->> 'candidate_domain';
    end if;

    insert into public.competitor_alerts (
      business_id,
      run_id,
      candidate_id,
      kind,
      severity,
      title,
      body,
      dedupe_key
    )
    values (
      v_run.business_id,
      p_run_id,
      v_candidate_id,
      v_alert ->> 'kind',
      v_alert ->> 'severity',
      v_alert ->> 'title',
      v_alert ->> 'body',
      v_alert ->> 'dedupe_key'
    )
    on conflict (dedupe_key) do nothing
    returning id into v_alert_id;

    if v_alert_id is not null then
      v_alert_ids := array_append(v_alert_ids, v_alert_id);
    end if;
  end loop;

  update public.competitor_research_runs
    set status = 'completed',
        stage = 'completed',
        model_id = p_model_id,
        provider_request_id = p_provider_request_id,
        source_count = p_source_count,
        error_code = null,
        error_message = null,
        completed_at = p_completed_at,
        updated_at = p_completed_at
    where id = p_run_id;

  return jsonb_build_object(
    'idempotent', false,
    'candidate_count', jsonb_array_length(coalesce(p_candidates, '[]'::jsonb)),
    'signal_count', jsonb_array_length(coalesce(p_signals, '[]'::jsonb)),
    'alert_ids', to_jsonb(v_alert_ids)
  );
end;
$$;

revoke all on function public.complete_competitor_research(
  uuid,
  text,
  text,
  integer,
  timestamptz,
  jsonb,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.complete_competitor_research(
  uuid,
  text,
  text,
  integer,
  timestamptz,
  jsonb,
  jsonb,
  jsonb
) to service_role;

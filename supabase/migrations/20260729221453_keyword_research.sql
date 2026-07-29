-- Persist source-backed keyword research completed by the outbound Qwen worker.
-- Authenticated clients can only read runs for businesses they own. All writes
-- happen in server code or signed worker callbacks through the service role.

create table if not exists public.keyword_research_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  source_mode text not null check (source_mode in ('url', 'profile')),
  source_url text,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  stage text not null default 'queued'
    check (
      stage in (
        'queued',
        'searching',
        'synthesizing',
        'finalizing',
        'completed',
        'failed'
      )
    ),
  input_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(input_snapshot) = 'object'),
  recommendations jsonb not null default '[]'::jsonb
    check (jsonb_typeof(recommendations) = 'array'),
  model_id text,
  provider_request_id text,
  source_count integer not null default 0 check (source_count >= 0),
  usage jsonb not null default '{}'::jsonb
    check (jsonb_typeof(usage) = 'object'),
  error_code text,
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint keyword_research_source_check check (
    (source_mode = 'url' and source_url is not null)
    or (source_mode = 'profile' and source_url is null)
  )
);

create unique index if not exists keyword_research_one_active_business_idx
  on public.keyword_research_runs (business_id)
  where status in ('queued', 'running');

create index if not exists keyword_research_business_created_idx
  on public.keyword_research_runs (business_id, created_at desc);

alter table public.keyword_research_runs enable row level security;

drop policy if exists "Users can view own keyword research" on public.keyword_research_runs;
create policy "Users can view own keyword research"
  on public.keyword_research_runs
  for select
  to authenticated
  using (
    business_id in (
      select b.id
      from public.businesses as b
      where b.owner_id = (select auth.uid())
    )
  );

revoke all on table public.keyword_research_runs from public, anon, authenticated;
grant select on table public.keyword_research_runs to authenticated;
grant select, insert, update, delete
  on table public.keyword_research_runs
  to service_role;

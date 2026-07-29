-- Businesses owned by dashboard users
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);

alter table public.businesses enable row level security;

create policy "Users can view own businesses"
  on public.businesses
  for select
  using (auth.uid() = owner_id);

create policy "Users can create own businesses"
  on public.businesses
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own businesses"
  on public.businesses
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own businesses"
  on public.businesses
  for delete
  using (auth.uid() = owner_id);

-- Per-user selected business
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  selected_business_id uuid references public.businesses (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can view own preferences"
  on public.user_preferences
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

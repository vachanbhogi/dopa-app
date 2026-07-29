-- Campaign profile fields for businesses
alter table public.businesses
  add column if not exists website text,
  add column if not exists industry text,
  add column if not exists description text,
  add column if not exists target_audience text,
  add column if not exists brand_voice text,
  add column if not exists value_proposition text,
  add column if not exists competitors text,
  add column if not exists markets text,
  add column if not exists campaign_goal text,
  add column if not exists updated_at timestamptz not null default now();

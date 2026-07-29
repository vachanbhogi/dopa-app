-- Brand default fields on businesses
alter table public.businesses
  add column if not exists price_range text,
  add column if not exists target_keywords text;

-- Products owned by a business
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_name text not null,
  category text,
  price numeric(12, 2),
  value_prop text,
  target_sub_demographic text,
  key_features text[] not null default '{}',
  creative_hooks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_business_id_idx on public.products (business_id);

alter table public.products enable row level security;

create policy "Users can view products for own businesses"
  on public.products
  for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = products.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can create products for own businesses"
  on public.products
  for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = products.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can update products for own businesses"
  on public.products
  for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = products.business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = products.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users can delete products for own businesses"
  on public.products
  for delete
  using (
    exists (
      select 1 from public.businesses b
      where b.id = products.business_id and b.owner_id = auth.uid()
    )
  );

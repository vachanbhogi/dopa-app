-- These two tables are intentionally service-only even through the Data API.
create policy "Deny client access to competitor workers"
  on public.competitor_workers
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Deny client access to internal request nonces"
  on public.internal_request_nonces
  for all
  to anon, authenticated
  using (false)
  with check (false);

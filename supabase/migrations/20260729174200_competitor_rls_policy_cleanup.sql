-- Older competitor policies were recreated by a concurrent legacy migration.
-- Keep the explicit per-operation policies from the intelligence migration.
drop policy if exists "Users can manage competitors of their businesses"
  on public.competitors;

drop policy if exists "Users can manage moves of their competitors"
  on public.competitor_moves;

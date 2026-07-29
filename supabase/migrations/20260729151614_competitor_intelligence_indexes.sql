-- Cover foreign keys used by report cleanup and relationship joins.
create index if not exists competitor_alerts_candidate_idx
  on public.competitor_alerts (candidate_id)
  where candidate_id is not null;

create index if not exists competitor_alerts_run_idx
  on public.competitor_alerts (run_id)
  where run_id is not null;

create index if not exists competitor_evidence_business_idx
  on public.competitor_evidence (business_id);

create index if not exists competitor_evidence_run_idx
  on public.competitor_evidence (run_id);

create index if not exists competitor_moves_business_idx
  on public.competitor_moves (business_id)
  where business_id is not null;

create index if not exists competitor_moves_research_run_idx
  on public.competitor_moves (research_run_id)
  where research_run_id is not null;

create index if not exists competitors_candidate_idx
  on public.competitors (candidate_id)
  where candidate_id is not null;

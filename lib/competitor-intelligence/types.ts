export const RESEARCH_CONTRACT_VERSION = 1 as const;

export type ResearchTrigger = "manual" | "scheduled";
export type ResearchStatus = "queued" | "running" | "completed" | "failed";
export type ResearchStage =
  | "queued"
  | "searching"
  | "synthesizing"
  | "finalizing"
  | "completed"
  | "failed";
export type CompetitorRelationship = "direct" | "indirect" | "emerging";
export type ThreatHorizon = "now" | "next_6_months" | "next_12_months";
export type EvidenceSourceType =
  | "official"
  | "news"
  | "review"
  | "directory"
  | "social"
  | "other";
export type AlertSeverity = "low" | "medium" | "high";

export type ScoreComponents = {
  customer_overlap: number;
  product_substitutability: number;
  momentum: number;
  distribution_overlap: number;
  evidence_quality: number;
};

export type BusinessResearchSnapshot = {
  name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  target_audience: string | null;
  value_proposition: string | null;
  markets: string | null;
  target_keywords: string | null;
};

export type TrackedCompetitorSnapshot = {
  id: string;
  name: string;
  website_url: string | null;
  primary_angle: string | null;
};

export type CompetitorResearchJob = {
  version: typeof RESEARCH_CONTRACT_VERSION;
  run_id: string;
  business_id: string;
  trigger: ResearchTrigger;
  business: BusinessResearchSnapshot;
  tracked_competitors: TrackedCompetitorSnapshot[];
};

export type CandidateEvidenceInput = {
  source_url: string;
  source_domain: string;
  title: string;
  source_type: EvidenceSourceType;
  claim: string;
  excerpt: string;
  published_at: string | null;
  observed_at: string;
  content_hash: string;
};

export type ResearchCandidateInput = {
  name: string;
  website_url: string;
  normalized_domain: string;
  relationship: CompetitorRelationship;
  threat_score: number;
  confidence: number;
  threat_horizon: ThreatHorizon;
  why_competitor: string;
  why_now: string;
  components: ScoreComponents;
  rank: number;
  evidence: CandidateEvidenceInput[];
};

export type CompetitorSignalInput = {
  tracked_competitor_id: string;
  move_type:
    | "product_launch"
    | "pricing_change"
    | "positioning_change"
    | "ad_activity"
    | "funding"
    | "hiring"
    | "partnership"
    | "market_expansion";
  title: string;
  description: string;
  risk_level: AlertSeverity;
  source_url: string;
  source_title: string;
  signal_date: string | null;
  observed_at: string;
  confidence: number;
  dedupe_key: string;
};

export type CompetitorResearchResult = {
  version: typeof RESEARCH_CONTRACT_VERSION;
  run_id: string;
  worker_id: string;
  model_id: string;
  provider_request_id: string | null;
  source_count: number;
  candidates: ResearchCandidateInput[];
  signals: CompetitorSignalInput[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    web_search_calls: number;
    web_extractor_calls: number;
  };
  completed_at: string;
};

export type ResearchProgressPayload = {
  version: typeof RESEARCH_CONTRACT_VERSION;
  run_id: string;
  worker_id: string;
  stage: Exclude<ResearchStage, "queued" | "completed">;
  error_code?: string;
  error_message?: string;
};

export type WorkerHeartbeatPayload = {
  version: typeof RESEARCH_CONTRACT_VERSION;
  worker_id: string;
  status: "starting" | "healthy" | "degraded";
  worker_version: string;
  queue_name: string;
  metadata: {
    node_version: string;
    uptime_seconds: number;
  };
  observed_at: string;
};

export type ResearchEvidenceDto = CandidateEvidenceInput & {
  id: string;
};

export type ResearchCandidateDto = Omit<ResearchCandidateInput, "components" | "evidence"> &
  ScoreComponents & {
    id: string;
    evidence: ResearchEvidenceDto[];
  };

export type ResearchRunDto = {
  id: string;
  business_id: string;
  trigger: ResearchTrigger;
  status: ResearchStatus;
  stage: ResearchStage;
  model_id: string | null;
  source_count: number;
  error_code: string | null;
  error_message: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  candidates: ResearchCandidateDto[];
};

export type MonitorSettingsDto = {
  business_id: string;
  enabled: boolean;
  cadence: "daily";
  local_time: string;
  timezone: string;
  min_alert_score: number;
  notify_in_app: boolean;
  notify_browser: boolean;
  next_run_at: string | null;
};

export type CompetitorAlertDto = {
  id: string;
  business_id: string;
  run_id: string | null;
  candidate_id: string | null;
  kind: "new_competitor" | "threat_increase" | "new_signal" | "research_failed";
  severity: AlertSeverity;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

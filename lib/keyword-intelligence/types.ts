export const KEYWORD_RESEARCH_CONTRACT_VERSION = 1 as const;
export const KEYWORD_RESEARCH_JOB_TYPE = "keyword_research" as const;

export type KeywordSourceMode = "url" | "profile";
export type KeywordResearchStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";
export type KeywordResearchStage =
  | "queued"
  | "searching"
  | "synthesizing"
  | "finalizing"
  | "completed"
  | "failed";
export type KeywordRecommendationStatus = "keep" | "improve" | "add";
export type KeywordCategory =
  | "commercial"
  | "problem"
  | "competitor"
  | "long_tail";
export type KeywordEvidenceKind = "web" | "profile";
export type KeywordProfileField =
  | "name"
  | "website"
  | "industry"
  | "description"
  | "target_audience"
  | "brand_voice"
  | "value_proposition"
  | "competitors"
  | "markets"
  | "campaign_goal"
  | "price_range"
  | "target_keywords";

export type KeywordBusinessSnapshot = Record<
  KeywordProfileField,
  string | null
> & {
  name: string;
};

export type KeywordProductSnapshot = {
  id: string;
  product_name: string;
  category: string | null;
  price: string | null;
  value_prop: string | null;
  target_sub_demographic: string | null;
  key_features: string[];
  creative_hooks: string[];
};

export type KeywordEvidence = {
  source_kind: KeywordEvidenceKind;
  source_url: string | null;
  profile_field: KeywordProfileField | null;
  title: string;
  claim: string;
  excerpt: string;
};

export type KeywordRecommendation = {
  keyword: string;
  current_keyword: string | null;
  status: KeywordRecommendationStatus;
  category: KeywordCategory;
  intent: string;
  feedback: string;
  suggested_ad_headline: string;
  confidence: number;
  rank: number;
  evidence: KeywordEvidence[];
};

export type KeywordResearchJob = {
  version: typeof KEYWORD_RESEARCH_CONTRACT_VERSION;
  job_type: typeof KEYWORD_RESEARCH_JOB_TYPE;
  run_id: string;
  business_id: string;
  source_mode: KeywordSourceMode;
  source_url: string | null;
  business: KeywordBusinessSnapshot;
  product: KeywordProductSnapshot | null;
};

export type KeywordResearchResult = {
  version: typeof KEYWORD_RESEARCH_CONTRACT_VERSION;
  job_type: typeof KEYWORD_RESEARCH_JOB_TYPE;
  run_id: string;
  worker_id: string;
  model_id: string;
  provider_request_id: string | null;
  source_count: number;
  recommendations: KeywordRecommendation[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    web_search_calls: number;
    web_extractor_calls: number;
  };
  completed_at: string;
};

export type KeywordResearchProgressPayload = {
  version: typeof KEYWORD_RESEARCH_CONTRACT_VERSION;
  job_type: typeof KEYWORD_RESEARCH_JOB_TYPE;
  run_id: string;
  worker_id: string;
  stage: Exclude<KeywordResearchStage, "queued" | "completed">;
  error_code?: string;
  error_message?: string;
};

export type KeywordResearchRunDto = {
  id: string;
  business_id: string;
  product_id: string | null;
  source_mode: KeywordSourceMode;
  source_url: string | null;
  status: KeywordResearchStatus;
  stage: KeywordResearchStage;
  model_id: string | null;
  source_count: number;
  error_code: string | null;
  error_message: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  recommendations: KeywordRecommendation[];
};

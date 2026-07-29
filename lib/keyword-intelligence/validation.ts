import {
  normalizeHttpUrl,
} from "../competitor-intelligence/validation";
import { isJsonObject, isUuid, stringValue } from "../validation";
import {
  KEYWORD_RESEARCH_CONTRACT_VERSION,
  KEYWORD_RESEARCH_JOB_TYPE,
  type KeywordBusinessSnapshot,
  type KeywordCategory,
  type KeywordEvidence,
  type KeywordProfileField,
  type KeywordRecommendation,
  type KeywordRecommendationStatus,
  type KeywordResearchJob,
  type KeywordResearchResult,
} from "./types";

const recommendationStatuses = new Set<KeywordRecommendationStatus>([
  "keep",
  "improve",
  "add",
]);
const keywordCategories = new Set<KeywordCategory>([
  "commercial",
  "problem",
  "competitor",
  "long_tail",
]);
const profileFields = new Set<KeywordProfileField>([
  "name",
  "website",
  "industry",
  "description",
  "target_audience",
  "brand_voice",
  "value_proposition",
  "competitors",
  "markets",
  "campaign_goal",
  "price_range",
  "target_keywords",
]);

type SourceCatalog = Map<string, { title: string }>;

type RecommendationValidationContext = {
  job?: KeywordResearchJob;
  allowedSources?: SourceCatalog;
};

function enumValue<T extends string>(
  value: unknown,
  allowed: Set<T>,
): T | null {
  return typeof value === "string" && allowed.has(value as T)
    ? (value as T)
    : null;
}

function isoDate(value: unknown): string | null {
  const text = stringValue(value, 80);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function boundedCount(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function profileValue(
  business: KeywordBusinessSnapshot | undefined,
  field: KeywordProfileField,
): string | null {
  const value = business?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEvidence(
  value: unknown,
  context: RecommendationValidationContext,
): KeywordEvidence | null {
  if (!isJsonObject(value)) return null;
  const sourceKind =
    value.source_kind === "web" || value.source_kind === "profile"
      ? value.source_kind
      : null;
  const claim = stringValue(value.claim, 800);
  const excerpt = stringValue(value.excerpt, 400);
  if (!sourceKind || !claim || !excerpt) return null;

  if (sourceKind === "web") {
    const sourceUrl = normalizeHttpUrl(value.source_url);
    if (!sourceUrl) return null;
    const canonical = context.allowedSources?.get(sourceUrl);
    if (context.allowedSources && !canonical) return null;
    return {
      source_kind: "web",
      source_url: sourceUrl,
      profile_field: null,
      title:
        canonical?.title ||
        stringValue(value.title, 300) ||
        new URL(sourceUrl).hostname.replace(/^www\./, ""),
      claim,
      excerpt,
    };
  }

  const field = enumValue(value.profile_field, profileFields);
  if (!field) return null;
  const savedValue = profileValue(context.job?.business, field);
  if (
    context.job &&
    (!savedValue ||
      !savedValue.toLocaleLowerCase().includes(excerpt.toLocaleLowerCase()))
  ) {
    return null;
  }
  return {
    source_kind: "profile",
    source_url: null,
    profile_field: field,
    title: `Business profile · ${field.replaceAll("_", " ")}`,
    claim,
    excerpt,
  };
}

export function normalizeKeywordRecommendations(
  value: unknown,
  context: RecommendationValidationContext = {},
): KeywordRecommendation[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();

  return value
    .flatMap((item) => {
      if (!isJsonObject(item)) return [];
      const keyword = stringValue(item.keyword, 120);
      const currentKeyword = stringValue(item.current_keyword, 120) ?? null;
      const status = enumValue(item.status, recommendationStatuses);
      const category = enumValue(item.category, keywordCategories);
      const intent = stringValue(item.intent, 500);
      const feedback = stringValue(item.feedback, 1_500);
      const headline = stringValue(item.suggested_ad_headline, 30);
      if (
        !keyword ||
        !status ||
        !category ||
        !intent ||
        !feedback ||
        !headline ||
        ((status === "keep" || status === "improve") && !currentKeyword)
      ) {
        return [];
      }
      const normalizedKeyword = keyword.toLocaleLowerCase();
      if (seen.has(normalizedKeyword)) return [];

      const evidence = Array.isArray(item.evidence)
        ? item.evidence
            .map((entry) => normalizeEvidence(entry, context))
            .filter((entry): entry is KeywordEvidence => entry !== null)
            .filter(
              (entry, index, list) =>
                list.findIndex(
                  (other) =>
                    other.source_kind === entry.source_kind &&
                    other.source_url === entry.source_url &&
                    other.profile_field === entry.profile_field &&
                    other.claim === entry.claim,
                ) === index,
            )
            .slice(0, 4)
        : [];
      if (evidence.length === 0) return [];
      if (
        context.job?.source_mode === "url" &&
        !evidence.some((entry) => entry.source_kind === "web")
      ) {
        return [];
      }

      const evidenceSources = new Set(
        evidence.map((entry) =>
          entry.source_kind === "web"
            ? new URL(entry.source_url!).hostname
            : `profile:${entry.profile_field}`,
        ),
      );
      const requestedConfidence = Math.min(
        100,
        Math.max(0, Math.round(Number(item.confidence) || 0)),
      );
      seen.add(normalizedKeyword);

      return [
        {
          keyword,
          current_keyword: currentKeyword,
          status,
          category,
          intent,
          feedback,
          suggested_ad_headline: headline,
          confidence:
            evidenceSources.size >= 2
              ? requestedConfidence
              : Math.min(requestedConfidence, 69),
          rank: 0,
          evidence,
        },
      ];
    })
    .slice(0, 12)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
    }));
}

export function isKeywordResearchJob(
  value: unknown,
): value is KeywordResearchJob {
  if (
    !isJsonObject(value) ||
    value.version !== KEYWORD_RESEARCH_CONTRACT_VERSION ||
    value.job_type !== KEYWORD_RESEARCH_JOB_TYPE ||
    !isUuid(value.run_id) ||
    !isUuid(value.business_id) ||
    (value.source_mode !== "url" && value.source_mode !== "profile") ||
    !isJsonObject(value.business) ||
    !stringValue(value.business.name, 160)
  ) {
    return false;
  }
  const sourceUrl =
    value.source_url === null ? null : normalizeHttpUrl(value.source_url);
  if (value.source_mode === "url" && !sourceUrl) return false;
  if (value.source_mode === "profile" && value.source_url !== null) return false;

  if (value.product !== null) {
    if (
      !isJsonObject(value.product) ||
      !isUuid(value.product.id) ||
      !stringValue(value.product.product_name, 160) ||
      !Array.isArray(value.product.key_features) ||
      !Array.isArray(value.product.creative_hooks)
    ) {
      return false;
    }
  }
  return true;
}

export function parseKeywordResearchResult(
  value: unknown,
): KeywordResearchResult | null {
  if (
    !isJsonObject(value) ||
    value.version !== KEYWORD_RESEARCH_CONTRACT_VERSION ||
    value.job_type !== KEYWORD_RESEARCH_JOB_TYPE
  ) {
    return null;
  }
  const runId = stringValue(value.run_id, 100);
  const workerId = stringValue(value.worker_id, 200);
  const modelId = stringValue(value.model_id, 200);
  const completedAt = isoDate(value.completed_at);
  const recommendations = normalizeKeywordRecommendations(
    value.recommendations,
  );
  if (
    !runId ||
    !isUuid(runId) ||
    !workerId ||
    !modelId ||
    !completedAt ||
    recommendations.length === 0
  ) {
    return null;
  }
  const usage = isJsonObject(value.usage) ? value.usage : {};
  return {
    version: KEYWORD_RESEARCH_CONTRACT_VERSION,
    job_type: KEYWORD_RESEARCH_JOB_TYPE,
    run_id: runId,
    worker_id: workerId,
    model_id: modelId,
    provider_request_id: stringValue(value.provider_request_id, 300) ?? null,
    source_count: Math.min(1_000, boundedCount(value.source_count)),
    recommendations,
    usage: {
      input_tokens: boundedCount(usage.input_tokens),
      output_tokens: boundedCount(usage.output_tokens),
      total_tokens: boundedCount(usage.total_tokens),
      web_search_calls: boundedCount(usage.web_search_calls),
      web_extractor_calls: boundedCount(usage.web_extractor_calls),
    },
    completed_at: completedAt,
  };
}

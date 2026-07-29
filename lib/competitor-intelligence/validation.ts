import { createHash } from "node:crypto";
import { isJsonObject, isUuid, stringValue } from "../validation";
import { calculateThreatScore, clampScore, selectRelationshipMix } from "./scoring";
import {
  RESEARCH_CONTRACT_VERSION,
  type CandidateEvidenceInput,
  type CompetitorRelationship,
  type CompetitorResearchJob,
  type CompetitorResearchResult,
  type CompetitorSignalInput,
  type EvidenceSourceType,
  type ResearchCandidateInput,
  type ThreatHorizon,
} from "./types";

const relationships = new Set<CompetitorRelationship>([
  "direct",
  "indirect",
  "emerging",
]);
const horizons = new Set<ThreatHorizon>([
  "now",
  "next_6_months",
  "next_12_months",
]);
const sourceTypes = new Set<EvidenceSourceType>([
  "official",
  "news",
  "review",
  "directory",
  "social",
  "other",
]);
const signalTypes = new Set<CompetitorSignalInput["move_type"]>([
  "product_launch",
  "pricing_change",
  "positioning_change",
  "ad_activity",
  "funding",
  "hiring",
  "partnership",
  "market_expansion",
]);
const riskLevels = new Set<CompetitorSignalInput["risk_level"]>([
  "low",
  "medium",
  "high",
]);

export function normalizeHttpUrl(value: unknown): string | null {
  const raw = stringValue(value, 2_048);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.includes(":") ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
    ) {
      return null;
    }
    if (url.username || url.password) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizedDomain(value: unknown): string | null {
  const url = normalizeHttpUrl(value);
  if (!url) return null;
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

function isoDate(value: unknown): string | null {
  const text = stringValue(value, 80);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function requiredEnum<T extends string>(
  value: unknown,
  values: Set<T>,
): T | null {
  return typeof value === "string" && values.has(value as T)
    ? (value as T)
    : null;
}

function normalizeEvidence(
  value: unknown,
  allowedSources?: Map<string, { title: string }>,
  now = new Date(),
): CandidateEvidenceInput | null {
  if (!isJsonObject(value)) return null;
  const sourceUrl = normalizeHttpUrl(value.source_url);
  const sourceDomain = normalizedDomain(sourceUrl);
  const sourceType = requiredEnum(value.source_type, sourceTypes) ?? "other";
  const claim = stringValue(value.claim, 1_000);
  const excerpt = stringValue(value.excerpt, 1_000);
  if (!sourceUrl || !sourceDomain || !claim || !excerpt) return null;

  const canonicalSource = allowedSources?.get(sourceUrl);
  if (allowedSources && !canonicalSource) return null;
  const title =
    canonicalSource?.title || stringValue(value.title, 500) || sourceDomain;
  const observedAt = now.toISOString();
  const contentHash = createHash("sha256")
    .update(`${sourceUrl}\n${claim}\n${excerpt}`)
    .digest("hex");

  return {
    source_url: sourceUrl,
    source_domain: sourceDomain,
    title,
    source_type: sourceType,
    claim,
    excerpt,
    published_at: isoDate(value.published_at),
    observed_at: observedAt,
    content_hash: contentHash,
  };
}

export function normalizeResearchCandidates(
  value: unknown,
  allowedSources?: Map<string, { title: string }>,
  now = new Date(),
): ResearchCandidateInput[] {
  if (!Array.isArray(value)) return [];
  const seenDomains = new Set<string>();

  const candidates = value.flatMap((item) => {
    if (!isJsonObject(item)) return [];
    const name = stringValue(item.name, 200);
    const websiteUrl = normalizeHttpUrl(item.website_url);
    const domain = normalizedDomain(websiteUrl);
    const relationship = requiredEnum(item.relationship, relationships);
    const horizon = requiredEnum(item.threat_horizon, horizons);
    const whyCompetitor = stringValue(item.why_competitor, 2_000);
    const whyNow = stringValue(item.why_now, 2_000);
    if (
      !name ||
      !websiteUrl ||
      !domain ||
      !relationship ||
      !horizon ||
      !whyCompetitor ||
      !whyNow ||
      seenDomains.has(domain)
    ) {
      return [];
    }

    const evidence = Array.isArray(item.evidence)
      ? item.evidence
          .map((entry) => normalizeEvidence(entry, allowedSources, now))
          .filter((entry): entry is CandidateEvidenceInput => entry !== null)
          .filter(
            (entry, index, list) =>
              list.findIndex(
                (other) =>
                  other.source_url === entry.source_url &&
                  other.content_hash === entry.content_hash,
              ) === index,
          )
          .slice(0, 5)
      : [];
    if (evidence.length === 0) return [];
    if (
      horizon === "now" &&
      !evidence.some((entry) => {
        if (!entry.published_at) return false;
        const age = now.getTime() - Date.parse(entry.published_at);
        return age >= 0 && age <= 90 * 24 * 60 * 60 * 1_000;
      })
    ) {
      return [];
    }

    const componentsObject = isJsonObject(item.components)
      ? item.components
      : item;
    const components = {
      customer_overlap: clampScore(componentsObject.customer_overlap),
      product_substitutability: clampScore(
        componentsObject.product_substitutability,
      ),
      momentum: clampScore(componentsObject.momentum),
      distribution_overlap: clampScore(
        componentsObject.distribution_overlap,
      ),
      evidence_quality: clampScore(componentsObject.evidence_quality),
    };
    const distinctDomains = new Set(
      evidence.map((entry) => entry.source_domain),
    ).size;
    const requestedConfidence = clampScore(item.confidence);
    const confidence =
      distinctDomains >= 2
        ? requestedConfidence
        : Math.min(requestedConfidence, 69);
    seenDomains.add(domain);

    return [
      {
        name,
        website_url: websiteUrl,
        normalized_domain: domain,
        relationship,
        threat_score: calculateThreatScore(components),
        confidence,
        threat_horizon: horizon,
        why_competitor: whyCompetitor,
        why_now: whyNow,
        components,
        rank: 0,
        evidence,
      },
    ];
  });

  return selectRelationshipMix(candidates).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}

export function normalizeSignal(
  value: unknown,
  allowedSources?: Map<string, { title: string }>,
  now = new Date(),
): CompetitorSignalInput | null {
  if (!isJsonObject(value)) return null;
  const trackedCompetitorId = stringValue(value.tracked_competitor_id, 100);
  const moveType = requiredEnum(value.move_type, signalTypes);
  const title = stringValue(value.title, 300);
  const description = stringValue(value.description, 2_000);
  const riskLevel = requiredEnum(value.risk_level, riskLevels);
  const sourceUrl = normalizeHttpUrl(value.source_url);
  const canonicalSource = sourceUrl ? allowedSources?.get(sourceUrl) : undefined;
  const sourceTitle =
    canonicalSource?.title || stringValue(value.source_title, 500);
  const signalDate = isoDate(value.signal_date);
  const observedAt = now.toISOString();
  if (
    !trackedCompetitorId ||
    !isUuid(trackedCompetitorId) ||
    !moveType ||
    !title ||
    !description ||
    !riskLevel ||
    !sourceUrl ||
    !sourceTitle ||
    !signalDate ||
    (allowedSources && !canonicalSource)
  ) {
    return null;
  }
  const age = now.getTime() - Date.parse(signalDate);
  if (age < 0 || age > 90 * 24 * 60 * 60 * 1_000) return null;
  return {
    tracked_competitor_id: trackedCompetitorId,
    move_type: moveType,
    title,
    description,
    risk_level: riskLevel,
    source_url: sourceUrl,
    source_title: sourceTitle,
    signal_date: signalDate,
    observed_at: observedAt,
    confidence: clampScore(value.confidence),
    dedupe_key: createHash("sha256")
      .update(`${trackedCompetitorId}\n${moveType}\n${sourceUrl}\n${title}`)
      .digest("hex"),
  };
}

export function parseResearchResult(value: unknown): CompetitorResearchResult | null {
  if (!isJsonObject(value) || value.version !== RESEARCH_CONTRACT_VERSION) {
    return null;
  }
  const runId = stringValue(value.run_id, 100);
  const workerId = stringValue(value.worker_id, 200);
  const modelId = stringValue(value.model_id, 200);
  const completedAt = isoDate(value.completed_at);
  if (!runId || !isUuid(runId) || !workerId || !modelId || !completedAt) {
    return null;
  }

  const usage = isJsonObject(value.usage) ? value.usage : {};
  const candidates = normalizeResearchCandidates(value.candidates);
  const signals = Array.isArray(value.signals)
    ? value.signals
        .map((signal) => normalizeSignal(signal))
        .filter((signal): signal is CompetitorSignalInput => signal !== null)
        .slice(0, 50)
    : [];

  return {
    version: RESEARCH_CONTRACT_VERSION,
    run_id: runId,
    worker_id: workerId,
    model_id: modelId,
    provider_request_id: stringValue(value.provider_request_id, 300) ?? null,
    source_count: Math.min(
      1_000,
      Math.max(0, Math.floor(Number(value.source_count) || 0)),
    ),
    candidates,
    signals,
    usage: {
      input_tokens: Math.max(0, Math.floor(Number(usage.input_tokens) || 0)),
      output_tokens: Math.max(0, Math.floor(Number(usage.output_tokens) || 0)),
      total_tokens: Math.max(0, Math.floor(Number(usage.total_tokens) || 0)),
      web_search_calls: Math.max(
        0,
        Math.floor(Number(usage.web_search_calls) || 0),
      ),
      web_extractor_calls: Math.max(
        0,
        Math.floor(Number(usage.web_extractor_calls) || 0),
      ),
    },
    completed_at: completedAt,
  };
}

export function isCompetitorResearchJob(
  value: unknown,
): value is CompetitorResearchJob {
  if (!isJsonObject(value) || value.version !== RESEARCH_CONTRACT_VERSION) {
    return false;
  }
  if (
    !isUuid(value.run_id) ||
    !isUuid(value.business_id) ||
    (value.trigger !== "manual" && value.trigger !== "scheduled") ||
    !isJsonObject(value.business) ||
    !stringValue(value.business.name, 200) ||
    !Array.isArray(value.tracked_competitors)
  ) {
    return false;
  }
  return value.tracked_competitors.every(
    (entry) =>
      isJsonObject(entry) &&
      isUuid(entry.id) &&
      Boolean(stringValue(entry.name, 200)),
  );
}

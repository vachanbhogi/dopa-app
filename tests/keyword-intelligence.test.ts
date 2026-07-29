import { describe, expect, test } from "bun:test";
import {
  isKeywordResearchJob,
  normalizeKeywordRecommendations,
  parseKeywordResearchResult,
} from "@/lib/keyword-intelligence/validation";
import {
  KEYWORD_RESEARCH_CONTRACT_VERSION,
  KEYWORD_RESEARCH_JOB_TYPE,
  type KeywordResearchJob,
} from "@/lib/keyword-intelligence/types";

const job: KeywordResearchJob = {
  version: KEYWORD_RESEARCH_CONTRACT_VERSION,
  job_type: KEYWORD_RESEARCH_JOB_TYPE,
  run_id: "11111111-1111-4111-8111-111111111111",
  business_id: "22222222-2222-4222-8222-222222222222",
  source_mode: "profile",
  source_url: null,
  business: {
    name: "Dopa",
    website: "https://itsdopa.vercel.app",
    industry: "SaaS / Software",
    description: "Pre-launch creative prediction for growth teams.",
    target_audience: "Performance marketing teams",
    brand_voice: "Technical & authoritative",
    value_proposition: "Predict campaign response before spending.",
    competitors: null,
    markets: "US",
    campaign_goal: "Conversions / sales",
    price_range: null,
    target_keywords: "ad testing, creative prediction",
  },
  product: null,
};

const webSource = "https://research.example/customer-language";
const validRecommendation = {
  keyword: "pre launch ad testing",
  current_keyword: "ad testing",
  status: "improve",
  category: "commercial",
  intent: "Teams looking for a way to validate ads before media spend.",
  feedback:
    "Use the pre-launch qualifier to separate Dopa from post-launch analytics.",
  suggested_ad_headline: "Test Ads Before Launch",
  confidence: 90,
  evidence: [
    {
      source_kind: "profile",
      source_url: null,
      profile_field: "target_keywords",
      title: "Ignored",
      claim: "The saved profile currently targets ad testing.",
      excerpt: "ad testing",
    },
    {
      source_kind: "web",
      source_url: webSource,
      profile_field: null,
      title: "Ignored model title",
      claim: "Customers use pre-launch language.",
      excerpt: "Marketers compare ads before committing budget.",
    },
  ],
};

describe("keyword research contracts", () => {
  test("accepts profile and URL jobs but rejects a URL job without a source", () => {
    expect(isKeywordResearchJob(job)).toBe(true);
    expect(
      isKeywordResearchJob({
        ...job,
        source_mode: "url",
        source_url: "https://example.com/product",
      }),
    ).toBe(true);
    expect(
      isKeywordResearchJob({
        ...job,
        source_mode: "url",
        source_url: null,
      }),
    ).toBe(false);
  });

  test("validates profile excerpts and canonical web sources", () => {
    const recommendations = normalizeKeywordRecommendations(
      [validRecommendation],
      {
        job,
        allowedSources: new Map([
          [webSource, { title: "Verified customer language" }],
        ]),
      },
    );
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]?.evidence[1]?.title).toBe(
      "Verified customer language",
    );
    expect(recommendations[0]?.confidence).toBe(90);

    expect(
      normalizeKeywordRecommendations(
        [
          {
            ...validRecommendation,
            evidence: [
              {
                ...validRecommendation.evidence[0],
                excerpt: "not present in the saved field",
              },
            ],
          },
        ],
        { job, allowedSources: new Map() },
      ),
    ).toEqual([]);
  });

  test("rejects uncatalogued web evidence and caps one-source confidence", () => {
    const oneSource = {
      ...validRecommendation,
      evidence: [validRecommendation.evidence[1]],
    };
    expect(
      normalizeKeywordRecommendations([oneSource], {
        job: { ...job, source_mode: "url", source_url: webSource },
        allowedSources: new Map(),
      }),
    ).toEqual([]);

    const [normalized] = normalizeKeywordRecommendations([oneSource], {
      job: { ...job, source_mode: "url", source_url: webSource },
      allowedSources: new Map([
        [webSource, { title: "Verified customer language" }],
      ]),
    });
    expect(normalized?.confidence).toBe(69);
  });

  test("parses a completed result without accepting empty reports", () => {
    const result = parseKeywordResearchResult({
      version: KEYWORD_RESEARCH_CONTRACT_VERSION,
      job_type: KEYWORD_RESEARCH_JOB_TYPE,
      run_id: job.run_id,
      worker_id: "worker",
      model_id: "qwen",
      provider_request_id: "request",
      source_count: 1,
      recommendations: [validRecommendation],
      usage: {},
      completed_at: "2026-07-29T22:00:00Z",
    });
    expect(result?.recommendations).toHaveLength(1);
    expect(
      parseKeywordResearchResult({
        version: KEYWORD_RESEARCH_CONTRACT_VERSION,
        job_type: KEYWORD_RESEARCH_JOB_TYPE,
        run_id: job.run_id,
        worker_id: "worker",
        model_id: "qwen",
        recommendations: [],
        completed_at: "2026-07-29T22:00:00Z",
      }),
    ).toBe(null);
  });
});

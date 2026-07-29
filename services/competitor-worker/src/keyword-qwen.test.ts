import { afterEach, describe, expect, test } from "bun:test";
import {
  KEYWORD_RESEARCH_CONTRACT_VERSION,
  KEYWORD_RESEARCH_JOB_TYPE,
  type KeywordResearchJob,
} from "../../../lib/keyword-intelligence/types";
import type { WorkerConfig } from "./config";
import { researchKeywords } from "./keyword-qwen";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const config: WorkerConfig = {
  accountId: "account",
  region: "us-east-1",
  accessKeyId: "key",
  accessKeySecret: "secret",
  queueName: "queue",
  callbackBaseUrl: "https://dopa.example",
  callbackSecret: "callback",
  dashscopeApiKey: "dashscope",
  qwenKeyExpiresAt: Date.now() + 60_000,
  qwenEndpoint:
    "https://dashscope-us.aliyuncs.com/compatible-mode/v1/responses",
  qwenModel: "qwen3.7-max-2026-06-08",
  workerId: "worker",
  workerVersion: "test",
};

const sourceUrl = "https://example.com/product";
const job: KeywordResearchJob = {
  version: KEYWORD_RESEARCH_CONTRACT_VERSION,
  job_type: KEYWORD_RESEARCH_JOB_TYPE,
  run_id: "11111111-1111-4111-8111-111111111111",
  business_id: "22222222-2222-4222-8222-222222222222",
  source_mode: "url",
  source_url: sourceUrl,
  business: {
    name: "Dopa",
    website: sourceUrl,
    industry: "Software",
    description: "Creative testing",
    target_audience: "Growth teams",
    brand_voice: null,
    value_proposition: "Test ads before launch",
    competitors: null,
    markets: "US",
    campaign_goal: "Conversions / sales",
    price_range: null,
    target_keywords: "ad testing",
  },
  product: null,
};

describe("Qwen keyword research", () => {
  test("extracts the imported URL and returns only catalogued evidence", async () => {
    const requestBodies: Array<Record<string, unknown>> = [];
    const responses = [
      {
        id: "research-request",
        output: [
          {
            type: "web_extractor_call",
            action: {
              sources: [{ url: sourceUrl, title: "Dopa product" }],
            },
          },
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "The page emphasizes testing ads before launch.",
              },
            ],
          },
        ],
        usage: {
          input_tokens: 10,
          output_tokens: 12,
          total_tokens: 22,
          x_tools: { web_search: { count: 1 }, web_extractor: { count: 1 } },
        },
      },
      {
        output: [
          {
            type: "function_call",
            name: "submit_keyword_report",
            arguments: JSON.stringify({
              recommendations: [
                {
                  keyword: "pre launch ad testing",
                  current_keyword: "ad testing",
                  status: "improve",
                  category: "commercial",
                  intent: "Validate creative before spending.",
                  feedback:
                    "Add the pre-launch qualifier to match the product promise.",
                  suggested_ad_headline: "Test Ads Before Launch",
                  confidence: 88,
                  evidence: [
                    {
                      source_kind: "web",
                      source_url: sourceUrl,
                      profile_field: null,
                      title: "Ignored",
                      claim: "The page promises pre-launch testing.",
                      excerpt: "Test ads before launch.",
                    },
                  ],
                },
              ],
            }),
          },
        ],
        usage: { input_tokens: 4, output_tokens: 5, total_tokens: 9 },
      },
    ];
    let calls = 0;
    globalThis.fetch = (async (_input, init) => {
      requestBodies.push(
        JSON.parse(String(init?.body)) as Record<string, unknown>,
      );
      return Response.json(responses[calls++]);
    }) as typeof fetch;

    const stages: string[] = [];
    const result = await researchKeywords(config, job, async (stage) => {
      stages.push(stage);
    });

    expect(stages).toEqual(["searching", "synthesizing", "finalizing"]);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]?.confidence).toBe(69);
    expect(result.recommendations[0]?.evidence[0]?.title).toBe("Dopa product");
    expect(String(requestBodies[0]?.input).includes(sourceUrl)).toBe(true);
    expect(
      String(requestBodies[0]?.input).includes("web extraction"),
    ).toBe(true);
    expect(
      String(requestBodies[1]?.input).includes(
        "Never claim search volume, CPC, ranking, or trend data.",
      ),
    ).toBe(true);
    expect(
      requestBodies.every((body) => body.store === false),
    ).toBe(true);
  });
});

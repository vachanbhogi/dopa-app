import { afterEach, expect, test } from "bun:test";
import type MNSClient from "@alicloud/mns";
import {
  KEYWORD_RESEARCH_CONTRACT_VERSION,
  KEYWORD_RESEARCH_JOB_TYPE,
  type KeywordResearchJob,
} from "../../../lib/keyword-intelligence/types";
import type { WorkerConfig } from "./config";
import { CompetitorWorker } from "./worker";

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
  qwenEndpoint: "https://dashscope.example/responses",
  qwenModel: "qwen",
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
    campaign_goal: "Conversions",
    price_range: null,
    target_keywords: "ad testing",
  },
  product: null,
};

test("dispatches keyword jobs to keyword callbacks on the shared worker", async () => {
  const callbacks: string[] = [];
  let qwenCall = 0;
  const fakeMns = {
    deleteMessage: async () => ({ code: 204, headers: {} }),
    changeMessageVisibility: async () => ({
      code: 200,
      headers: {},
      body: { ReceiptHandle: "receipt-next" },
    }),
  } as unknown as MNSClient;

  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url === config.qwenEndpoint) {
      qwenCall += 1;
      if (qwenCall === 1) {
        return Response.json({
          output: [
            {
              type: "web_search_call",
              action: { sources: [{ url: sourceUrl, title: "Product" }] },
            },
            {
              type: "message",
              content: [{ type: "output_text", text: "Research." }],
            },
          ],
        });
      }
      return Response.json({
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
                  feedback: "Use the clearer pre-launch qualifier.",
                  suggested_ad_headline: "Test Ads Before Launch",
                  confidence: 60,
                  evidence: [
                    {
                      source_kind: "web",
                      source_url: sourceUrl,
                      profile_field: null,
                      title: "Product",
                      claim: "The product supports pre-launch testing.",
                      excerpt: "Test ads before launch.",
                    },
                  ],
                },
              ],
            }),
          },
        ],
      });
    }
    callbacks.push(new URL(url).pathname);
    return Response.json({ success: true });
  }) as typeof fetch;

  const worker = new CompetitorWorker(config, fakeMns);
  const process = (
    worker as unknown as {
      process(message: {
        job: KeywordResearchJob;
        receiptHandle: string;
        dequeueCount: number;
      }): Promise<void>;
    }
  ).process.bind(worker);
  await process({ job, receiptHandle: "receipt", dequeueCount: 1 });

  expect(callbacks).toEqual([
    "/api/internal/keywords/progress",
    "/api/internal/keywords/progress",
    "/api/internal/keywords/progress",
    "/api/internal/keywords/results",
  ]);
});

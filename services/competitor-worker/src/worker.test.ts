import { afterEach, describe, expect, test } from "bun:test";
import type MNSClient from "@alicloud/mns";
import type { CompetitorResearchJob } from "../../../lib/competitor-intelligence/types";
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
  callbackBaseUrl: "https://itsdopa.vercel.app",
  callbackSecret: "callback",
  dashscopeApiKey: "dashscope",
  qwenKeyExpiresAt: Date.now() + 60_000,
  qwenEndpoint:
    "https://dashscope-us.aliyuncs.com/compatible-mode/v1/responses",
  qwenModel: "qwen3.7-max-2026-06-08",
  workerId: "worker",
  workerVersion: "test",
};

const job: CompetitorResearchJob = {
  version: 1,
  run_id: "11111111-1111-4111-8111-111111111111",
  business_id: "22222222-2222-4222-8222-222222222222",
  trigger: "manual",
  business: {
    name: "Dopa",
    website: "https://itsdopa.vercel.app",
    industry: "Software",
    description: "Market intelligence",
    target_audience: "Growth teams",
    value_proposition: "Evidence-backed decisions",
    markets: "US",
    target_keywords: "competitor research",
  },
  tracked_competitors: [],
};

function qwenResearchResponse() {
  return {
    id: "research-response",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: "No defensible candidates." }],
      },
    ],
    usage: {
      input_tokens: 1,
      output_tokens: 1,
      total_tokens: 2,
      x_tools: { web_search: { count: 1 }, web_extractor: { count: 1 } },
    },
  };
}

function qwenStructuredResponse() {
  return {
    output: [
      {
        type: "function_call",
        name: "submit_competitor_report",
        arguments: JSON.stringify({ candidates: [], signals: [] }),
      },
    ],
    usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
  };
}

function processor(worker: CompetitorWorker) {
  return (
    worker as unknown as {
      process(message: {
        job: CompetitorResearchJob;
        receiptHandle: string;
        dequeueCount: number;
      }): Promise<void>;
    }
  ).process.bind(worker);
}

describe("MNS worker delivery semantics", () => {
  test("extends visibility and deletes only after each duplicate result callback", async () => {
    const events: string[] = [];
    const callbackRunIds: string[] = [];
    let qwenCalls = 0;
    let visibilityCalls = 0;
    const fakeMns = {
      changeMessageVisibility: async () => {
        visibilityCalls += 1;
        events.push("visibility");
        return {
          code: 200,
          headers: {},
          body: { ReceiptHandle: `receipt-${visibilityCalls}` },
        };
      },
      deleteMessage: async (_queue: string, receipt: string) => {
        events.push(`delete:${receipt}`);
        return { code: 204, headers: {} };
      },
    } as unknown as MNSClient;

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url === config.qwenEndpoint) {
        qwenCalls += 1;
        if (qwenCalls % 2 === 1) {
          await new Promise((resolve) => setTimeout(resolve, 8));
          return Response.json(qwenResearchResponse());
        }
        return Response.json(qwenStructuredResponse());
      }
      const path = new URL(url).pathname;
      if (path.endsWith("/results")) {
        events.push("result-callback");
        const body = JSON.parse(String(init?.body)) as { run_id: string };
        callbackRunIds.push(body.run_id);
      } else {
        events.push("progress-callback");
      }
      return Response.json({ success: true });
    }) as typeof fetch;

    const worker = new CompetitorWorker(config, fakeMns, {
      visibilityRefreshMs: 1,
      visibilitySeconds: 900,
    });
    const process = processor(worker);
    await process({ job, receiptHandle: "receipt", dequeueCount: 1 });
    await process({ job, receiptHandle: "receipt-duplicate", dequeueCount: 2 });

    expect(visibilityCalls > 0).toBe(true);
    expect(callbackRunIds).toEqual([job.run_id, job.run_id]);
    expect(events.filter((event) => event === "result-callback")).toHaveLength(2);
    expect(events.filter((event) => event.startsWith("delete:"))).toHaveLength(2);
    for (let index = 0; index < events.length; index += 1) {
      if (events[index] === "result-callback") {
        const followingDelete = events
          .slice(index + 1)
          .findIndex((event) => event.startsWith("delete:"));
        expect(followingDelete >= 0).toBe(true);
      }
    }
  });

  test("retries provider 5xx and poison-handles the third delivery", async () => {
    const events: string[] = [];
    let qwenCalls = 0;
    const fakeMns = {
      changeMessageVisibility: async () => ({
        code: 200,
        headers: {},
        body: { ReceiptHandle: "receipt-refreshed" },
      }),
      deleteMessage: async () => {
        events.push("delete");
        return { code: 204, headers: {} };
      },
    } as unknown as MNSClient;

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url === config.qwenEndpoint) {
        qwenCalls += 1;
        return new Response("provider unavailable", {
          status: 500,
          headers: { "Retry-After": "0" },
        });
      }
      const body = JSON.parse(String(init?.body)) as { stage?: string };
      events.push(body.stage === "failed" ? "failed-callback" : "progress-callback");
      return Response.json({ success: true });
    }) as typeof fetch;

    const worker = new CompetitorWorker(config, fakeMns);
    await processor(worker)({
      job,
      receiptHandle: "receipt-third",
      dequeueCount: 3,
    });

    expect(qwenCalls).toBe(3);
    expect(events).toEqual(["progress-callback", "failed-callback", "delete"]);
  });
});

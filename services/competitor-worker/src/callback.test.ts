import { afterEach, expect, test } from "bun:test";
import { postSigned } from "./callback";
import type { WorkerConfig } from "./config";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("signed callbacks include the optional Vercel automation bypass", async () => {
  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    expect(headers.get("x-vercel-protection-bypass")).toBe("preview-bypass");
    expect(headers.get("x-dopa-signature")).toHaveLength(64);
    return Response.json({ ok: true });
  };

  const config: WorkerConfig = {
    accountId: "1234567890123456",
    region: "us-east-1",
    accessKeyId: "test-access-key",
    accessKeySecret: "test-access-secret",
    queueName: "dopa-competitor-research-v1",
    callbackBaseUrl: "https://preview.example.com",
    callbackSecret: "a".repeat(64),
    callbackBypassSecret: "preview-bypass",
    dashscopeApiKey: "test-dashscope-key",
    qwenEndpoint:
      "https://dashscope-us.aliyuncs.com/compatible-mode/v1/responses",
    qwenModel: "qwen3.7-max-2026-06-08",
    workerId: "test-worker",
    workerVersion: "1.0.0",
  };

  await postSigned(config, "/api/internal/competitors/heartbeat", {
    version: 1,
  });
});

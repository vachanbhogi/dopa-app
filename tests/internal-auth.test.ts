import { afterEach, describe, expect, mock, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";

mock.module("server-only", () => ({}));

const {
  readVerifiedInternalJson,
  signInternalPayload,
  verifyInternalRequest,
} = await import("@/lib/server/internal-auth");

const originalSecret = process.env.DOPA_RESEARCH_HMAC_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.DOPA_RESEARCH_HMAC_SECRET;
  } else {
    process.env.DOPA_RESEARCH_HMAC_SECRET = originalSecret;
  }
});

function fakeAdmin(insertError: { code?: string } | null = null) {
  return {
    from: () => ({
      insert: async () => ({ error: insertError }),
      delete: () => ({
        lt: async () => ({ error: null }),
      }),
    }),
  } as unknown as SupabaseClient;
}

function signedRequest(
  body: string,
  timestamp: string,
  nonce: string,
  signatureBody = body,
) {
  const secret = "test-internal-secret";
  process.env.DOPA_RESEARCH_HMAC_SECRET = secret;
  return new Request("https://dopa.example/api/internal/competitors/results", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dopa-timestamp": timestamp,
      "x-dopa-nonce": nonce,
      "x-dopa-signature": signInternalPayload(
        secret,
        timestamp,
        nonce,
        signatureBody,
      ),
    },
    body,
  });
}

describe("internal callback authentication", () => {
  test("accepts a fresh signature and records its nonce", async () => {
    const body = JSON.stringify({ version: 1 });
    const timestamp = String(Math.floor(Date.now() / 1_000));
    const result = await verifyInternalRequest(
      signedRequest(body, timestamp, "nonce-valid"),
      body,
      fakeAdmin(),
    );
    expect(result).toEqual({ ok: true });
  });

  test("rejects expired and tampered requests", async () => {
    const body = JSON.stringify({ version: 1 });
    const expired = String(Math.floor(Date.now() / 1_000) - 301);
    const expiredResult = await verifyInternalRequest(
      signedRequest(body, expired, "nonce-expired"),
      body,
      fakeAdmin(),
    );
    expect(expiredResult).toMatchObject({ ok: false, status: 401 });

    const timestamp = String(Math.floor(Date.now() / 1_000));
    const tamperedResult = await verifyInternalRequest(
      signedRequest(body, timestamp, "nonce-tampered", "{}"),
      body,
      fakeAdmin(),
    );
    expect(tamperedResult).toMatchObject({ ok: false, status: 401 });
  });

  test("rejects a replayed nonce", async () => {
    const body = JSON.stringify({ version: 1 });
    const timestamp = String(Math.floor(Date.now() / 1_000));
    const result = await verifyInternalRequest(
      signedRequest(body, timestamp, "nonce-replayed"),
      body,
      fakeAdmin({ code: "23505" }),
    );
    expect(result).toMatchObject({ ok: false, status: 409 });
  });

  test("rejects a declared payload over the route limit before reading it", async () => {
    process.env.DOPA_RESEARCH_HMAC_SECRET = "test-internal-secret";
    const request = new Request(
      "https://dopa.example/api/internal/competitors/results",
      {
        method: "POST",
        headers: { "Content-Length": String(1024 * 1024 + 1) },
        body: "{}",
      },
    );
    const result = await readVerifiedInternalJson(request, fakeAdmin());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });
});

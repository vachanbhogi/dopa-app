import assert from "node:assert/strict";
import {
  fetchLiveGoogleAdsData,
  refreshGoogleAccessToken,
} from "../utils/google-ads-client";
import {
  isGoogleAdsAccessTokenFresh,
  openGoogleAdsToken,
  sealGoogleAdsToken,
} from "../utils/google-ads-token";
import { safeNextUrl } from "../utils/safe-next-url";

const originalFetch = globalThis.fetch;

async function test(name: string, run: () => Promise<void>) {
  try {
    await run();
    console.log(`✓ ${name}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await test("rejects missing Google Ads configuration without a request", async () => {
  let requests = 0;
  globalThis.fetch = (async () => {
    requests += 1;
    throw new Error("Unexpected request");
  }) as typeof fetch;

  const result = await fetchLiveGoogleAdsData({
    customerId: "",
    developerToken: "",
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "configuration_required");
  assert.equal(requests, 0);
});

await test("uses v25 and maps a live campaign into the dashboard model", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(
      JSON.stringify([
        {
          results: [
            {
              customer: {
                descriptiveName: "Dopa Test Account",
                currencyCode: "USD",
                timeZone: "America/Los_Angeles",
              },
              campaign: {
                id: "42",
                name: "Search Launch",
                status: "ENABLED",
                advertisingChannelType: "SEARCH",
              },
              metrics: {
                costMicros: "125500000",
                impressions: "10000",
                clicks: "250",
                ctr: 0.025,
                conversions: 12,
                conversionsValue: 500,
              },
            },
          ],
        },
      ]),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "request-id": "request-42",
        },
      },
    );
  }) as typeof fetch;

  const result = await fetchLiveGoogleAdsData({
    customerId: "123-456-7890",
    developerToken: "developer-token",
    loginCustomerId: "987-654-3210",
    accessToken: "access-token",
  });
  const headers = new Headers(requestInit?.headers);

  assert.equal(result.success, true);
  assert.equal(
    requestUrl,
    "https://googleads.googleapis.com/v25/customers/1234567890/googleAds:searchStream",
  );
  assert.equal(headers.get("Authorization"), "Bearer access-token");
  assert.equal(headers.get("developer-token"), "developer-token");
  assert.equal(headers.get("login-customer-id"), "9876543210");
  assert.equal(result.requestId, "request-42");
  assert.deepEqual(result.accountDetails, {
    customerId: "1234567890",
    descriptiveName: "Dopa Test Account",
    currencyCode: "USD",
    timeZone: "America/Los_Angeles",
  });
  assert.deepEqual(result.campaigns[0], {
    id: "42",
    name: "Search Launch",
    status: "ENABLED",
    channelType: "SEARCH",
    spend: 125.5,
    impressions: 10000,
    clicks: 250,
    ctr: 2.5,
    conversions: 12,
    conversionsValue: 500,
    roas: 3.98,
  });
});

await test("maps expired Google authorization to a reconnectable error", async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify([
        {
          error: {
            message: "Request had invalid authentication credentials.",
          },
        },
      ]),
      {
        status: 401,
        headers: { "request-id": "expired-token-request" },
      },
    )) as typeof fetch;

  const result = await fetchLiveGoogleAdsData({
    customerId: "1234567890",
    developerToken: "developer-token",
    accessToken: "expired-token",
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "oauth_required");
  assert.equal(
    result.error,
    "Request had invalid authentication credentials.",
  );
  assert.equal(result.requestId, "expired-token-request");
});

await test("refreshes a server-side OAuth token safely", async () => {
  let body = "";
  globalThis.fetch = (async (_input, init) => {
    body = String(init?.body);
    return new Response(
      JSON.stringify({ access_token: "refreshed-access-token" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  const token = await refreshGoogleAccessToken(
    "client-id",
    "client-secret",
    "refresh-token",
  );

  assert.equal(token, "refreshed-access-token");
  assert.match(body, /grant_type=refresh_token/);
  assert.match(body, /refresh_token=refresh-token/);
});

await test("encrypts, decrypts, expires, and rejects tampered OAuth tokens", async () => {
  const secret = Buffer.alloc(32, 7).toString("base64");
  const now = 1_000_000;
  const sealed = await sealGoogleAdsToken(
    {
      accessToken: "google-access-token",
      refreshToken: "google-refresh-token",
    },
    secret,
    "user-123",
    now,
  );

  assert.notEqual(sealed.includes("google-access-token"), true);
  assert.notEqual(sealed.includes("google-refresh-token"), true);
  const opened = await openGoogleAdsToken(
    sealed,
    secret,
    "user-123",
    now,
  );
  assert.deepEqual(opened, {
    accessToken: "google-access-token",
    refreshToken: "google-refresh-token",
    accessTokenExpiresAt: now + 55 * 60 * 1000,
  });
  assert.ok(opened);
  assert.equal(isGoogleAdsAccessTokenFresh(opened, now), true);
  assert.equal(
    isGoogleAdsAccessTokenFresh(
      opened,
      now + 51 * 60 * 1000,
    ),
    false,
  );
  assert.ok(
    await openGoogleAdsToken(
      sealed,
      secret,
      "user-123",
      now + 55 * 60 * 1000,
    ),
  );
  assert.equal(
    await openGoogleAdsToken(
      sealed,
      secret,
      "user-123",
      now + 31 * 24 * 60 * 60 * 1000,
    ),
    null,
  );
  assert.equal(
    await openGoogleAdsToken(sealed, secret, "different-user", now),
    null,
  );

  const [version, iv, ciphertext] = sealed.split(".");
  assert.ok(version && iv && ciphertext);
  const tamperedCiphertext = `${
    ciphertext.startsWith("a") ? "b" : "a"
  }${ciphertext.slice(1)}`;
  const tampered = [version, iv, tamperedCiphertext].join(".");
  assert.equal(
    await openGoogleAdsToken(tampered, secret, "user-123", now),
    null,
  );
});

await test("keeps OAuth redirects on the Dopa origin", async () => {
  const origin = "https://dopa.example";

  assert.equal(
    safeNextUrl("/dashboard?tab=googleAds", origin).href,
    "https://dopa.example/dashboard?tab=googleAds",
  );
  assert.equal(
    safeNextUrl("//evil.example", origin).href,
    "https://dopa.example/dashboard",
  );
  assert.equal(
    safeNextUrl("/\\evil.example", origin).href,
    "https://dopa.example/dashboard",
  );
  assert.equal(
    safeNextUrl("https://evil.example", origin).href,
    "https://dopa.example/dashboard",
  );
});

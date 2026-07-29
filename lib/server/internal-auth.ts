import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
const NONCE_RETENTION_SECONDS = 10 * 60;

function signaturePayload(
  timestamp: string,
  nonce: string,
  rawBody: string,
): string {
  const digest = createHash("sha256").update(rawBody, "utf8").digest("hex");
  return `${timestamp}.${nonce}.${digest}`;
}

export function signInternalPayload(
  secret: string,
  timestamp: string,
  nonce: string,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(signaturePayload(timestamp, nonce, rawBody))
    .digest("hex");
}

export async function verifyInternalRequest(
  request: Request,
  rawBody: string,
  admin: SupabaseClient,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const secret = process.env.DOPA_RESEARCH_HMAC_SECRET;
  if (!secret) {
    return { ok: false, status: 503, error: "Internal authentication is not configured." };
  }

  const timestamp = request.headers.get("x-dopa-timestamp");
  const nonce = request.headers.get("x-dopa-nonce");
  const signature = request.headers.get("x-dopa-signature");
  if (!timestamp || !nonce || !signature || nonce.length > 200) {
    return { ok: false, status: 401, error: "Missing internal authentication." };
  }

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1_000);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS
  ) {
    return { ok: false, status: 401, error: "Internal request expired." };
  }

  const expected = signInternalPayload(secret, timestamp, nonce, rawBody);
  const receivedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return { ok: false, status: 401, error: "Invalid internal signature." };
  }

  const expiresAt = new Date(
    (nowSeconds + NONCE_RETENTION_SECONDS) * 1_000,
  ).toISOString();
  const { error } = await admin
    .from("internal_request_nonces")
    .insert({ nonce, expires_at: expiresAt });
  if (error?.code === "23505") {
    return { ok: false, status: 409, error: "Internal request replayed." };
  }
  if (error) {
    return { ok: false, status: 503, error: "Could not verify request replay state." };
  }

  await admin
    .from("internal_request_nonces")
    .delete()
    .lt("expires_at", new Date(nowSeconds * 1_000).toISOString());

  return { ok: true };
}

export async function readVerifiedInternalJson(
  request: Request,
  admin: SupabaseClient,
  maxBytes = 1024 * 1024,
): Promise<
  | { ok: true; value: unknown; rawBody: string }
  | { ok: false; response: Response }
> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      response: Response.json({ error: "Payload too large." }, { status: 413 }),
    };
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    return {
      ok: false,
      response: Response.json({ error: "Payload too large." }, { status: 413 }),
    };
  }

  const verification = await verifyInternalRequest(request, rawBody, admin);
  if (!verification.ok) {
    return {
      ok: false,
      response: Response.json(
        { error: verification.error },
        { status: verification.status },
      ),
    };
  }

  try {
    return { ok: true, value: JSON.parse(rawBody), rawBody };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}

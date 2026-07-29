import { isJsonObject } from "@/lib/validation";

const TOKEN_VERSION = "v1";
const ACCESS_TOKEN_LIFETIME_MS = 55 * 60 * 1000;
const COOKIE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const MINIMUM_ACCESS_TOKEN_VALIDITY_MS = 5 * 60 * 1000;

export const GOOGLE_ADS_TOKEN_COOKIE = "dopa_google_ads_token";
export const GOOGLE_ADS_TOKEN_MAX_AGE_SECONDS = Math.floor(
  COOKIE_LIFETIME_MS / 1000,
);

type StoredGoogleAdsToken = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  accessTokenExpiresAt: number;
  cookieExpiresAt: number;
};

export type GoogleAdsOAuthTokens = Pick<
  StoredGoogleAdsToken,
  "accessToken" | "refreshToken" | "accessTokenExpiresAt"
>;

function decodeKey(secret: string): Uint8Array {
  const bytes = Buffer.from(secret, "base64");
  if (bytes.length !== 32) {
    throw new Error(
      "GOOGLE_ADS_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }
  return bytes;
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string): Uint8Array {
  return Buffer.from(value, "base64url");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(decodeKey(secret)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sealGoogleAdsToken(
  tokens: {
    accessToken: string;
    refreshToken: string;
  },
  secret: string,
  userId: string,
  now = Date.now(),
): Promise<string> {
  if (!tokens.accessToken.trim()) {
    throw new Error("Cannot store an empty Google Ads access token.");
  }
  if (!tokens.refreshToken.trim()) {
    throw new Error("Cannot store an empty Google Ads refresh token.");
  }
  if (!userId.trim()) {
    throw new Error("Cannot store a Google Ads token without a user ID.");
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(secret);
  const payload: StoredGoogleAdsToken = {
    accessToken: tokens.accessToken.trim(),
    refreshToken: tokens.refreshToken.trim(),
    userId: userId.trim(),
    accessTokenExpiresAt: now + ACCESS_TOKEN_LIFETIME_MS,
    cookieExpiresAt: now + COOKIE_LIFETIME_MS,
  };
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  return [
    TOKEN_VERSION,
    toBase64Url(iv),
    toBase64Url(new Uint8Array(ciphertext)),
  ].join(".");
}

export async function openGoogleAdsToken(
  sealedToken: string,
  secret: string,
  expectedUserId: string,
  now = Date.now(),
): Promise<GoogleAdsOAuthTokens | null> {
  const [version, encodedIv, encodedCiphertext] = sealedToken.split(".");
  if (
    version !== TOKEN_VERSION ||
    !encodedIv ||
    !encodedCiphertext
  ) {
    return null;
  }

  try {
    const key = await importKey(secret);
    const iv = fromBase64Url(encodedIv);
    const ciphertext = fromBase64Url(encodedCiphertext);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext),
    );
    const payload: unknown = JSON.parse(
      new TextDecoder().decode(plaintext),
    );

    if (
      !isJsonObject(payload) ||
      typeof payload.accessToken !== "string" ||
      !payload.accessToken ||
      typeof payload.refreshToken !== "string" ||
      !payload.refreshToken ||
      typeof payload.userId !== "string" ||
      payload.userId !== expectedUserId ||
      typeof payload.accessTokenExpiresAt !== "number" ||
      typeof payload.cookieExpiresAt !== "number" ||
      payload.cookieExpiresAt <= now
    ) {
      return null;
    }

    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      accessTokenExpiresAt: payload.accessTokenExpiresAt,
    };
  } catch {
    return null;
  }
}

export function isGoogleAdsAccessTokenFresh(
  tokens: GoogleAdsOAuthTokens,
  now = Date.now(),
): boolean {
  return (
    tokens.accessTokenExpiresAt - now >
    MINIMUM_ACCESS_TOKEN_VALIDITY_MS
  );
}

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export function verifyEvidenceSignature(input: {
  body: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowSeconds?: number;
}) {
  if (
    new TextEncoder().encode(input.secret).byteLength < 32 ||
    !input.timestamp ||
    !/^\d{10}$/.test(input.timestamp) ||
    Math.abs(
      (input.nowSeconds ?? Date.now() / 1_000) - Number(input.timestamp),
    ) > 300 ||
    !input.signature ||
    !/^[a-f0-9]{64}$/i.test(input.signature)
  ) {
    return false;
  }
  const actual = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.body}`)
    .digest();
  const expected = Buffer.from(input.signature, "hex");
  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

import { timingSafeEqual } from "node:crypto";

export function isCronAuthorized(
  authorization: string | null,
  secret: string | undefined,
) {
  const expectedSecret = secret?.trim();
  const supplied = authorization ?? "";
  if (
    !expectedSecret ||
    new TextEncoder().encode(expectedSecret).byteLength < 32 ||
    !supplied.startsWith("Bearer ")
  ) {
    return false;
  }
  const actual = Buffer.from(supplied.slice(7));
  const expected = Buffer.from(expectedSecret);
  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

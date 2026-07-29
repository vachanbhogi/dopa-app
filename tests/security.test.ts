import assert from "node:assert/strict";
import {
  isPublicIpAddress,
  normalizeWebsiteUrl,
} from "../utils/public-url";

function test(name: string, run: () => void) {
  run();
  console.log(`✓ ${name}`);
}

test("normalizes public website URLs", () => {
  assert.equal(normalizeWebsiteUrl("example.com").href, "https://example.com/");
  assert.equal(
    normalizeWebsiteUrl("http://example.com/path").href,
    "http://example.com/path",
  );
});

test("rejects local, credentialed, and non-HTTP website URLs", () => {
  assert.throws(() => normalizeWebsiteUrl("http://localhost:3000"));
  assert.throws(() => normalizeWebsiteUrl("https://service.local"));
  assert.throws(() => normalizeWebsiteUrl("https://user:secret@example.com"));
  assert.throws(() => normalizeWebsiteUrl("ftp://example.com"));
});

test("blocks private and special-use IP addresses", () => {
  for (const address of [
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "198.51.100.2",
    "::1",
    "fd00::1",
    "fe80::1",
    "2001:db8::1",
  ]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
});

test("allows globally routable IP addresses", () => {
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("1.1.1.1"), true);
  assert.equal(
    isPublicIpAddress("2606:4700:4700::1111"),
    true,
  );
});

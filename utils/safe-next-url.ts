export function safeNextUrl(
  value: string | null,
  origin: string,
  fallbackPath = "/dashboard",
): URL {
  const fallback = new URL(fallbackPath, origin);
  if (!value || !value.startsWith("/")) {
    return fallback;
  }

  try {
    const candidate = new URL(value, origin);
    return candidate.origin === fallback.origin ? candidate : fallback;
  } catch {
    return fallback;
  }
}

export function safeNextPath(
  value: string | null,
  origin: string,
  fallbackPath = "/dashboard",
): string {
  const url = safeNextUrl(value, origin, fallbackPath);
  return `${url.pathname}${url.search}${url.hash}`;
}

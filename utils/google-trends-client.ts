export interface GoogleTrendSignal {
  query: string;
}

export async function fetchGoogleTrendsData(
  queryKeyword: string
): Promise<GoogleTrendSignal[]> {
  try {
    const url = `https://trends.google.com/trends/api/autocomplete/${encodeURIComponent(
      queryKeyword
    )}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const text = await response.text();
    const cleaned = text.replace(/^\)\}\]'[^\n]*\n/, "").trim();
    const data: unknown = JSON.parse(cleaned);
    if (
      typeof data !== "object" ||
      data === null ||
      !("default" in data) ||
      typeof data.default !== "object" ||
      data.default === null ||
      !("topics" in data.default) ||
      !Array.isArray(data.default.topics)
    ) {
      return [];
    }

    return data.default.topics.flatMap((topic) => {
      if (typeof topic !== "object" || topic === null) return [];
      const query =
        "title" in topic && typeof topic.title === "string"
          ? topic.title
          : "mid" in topic && typeof topic.mid === "string"
            ? topic.mid
            : null;
      return query ? [{ query }] : [];
    });
  } catch {
    return [];
  }
}

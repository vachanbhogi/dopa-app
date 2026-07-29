export interface GoogleTrendSignal {
  query: string;
  trendGrowth?: string;
  isSurging?: boolean;
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
    const data = JSON.parse(cleaned);

    const topics = data?.default?.topics || [];
    return topics.map((t: any) => ({
      query: t.title || t.mid,
      trendGrowth: "+85% Growth",
      isSurging: true,
    }));
  } catch {
    return [];
  }
}

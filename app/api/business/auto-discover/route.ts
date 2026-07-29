import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { websiteUrl } = await req.json();

    if (!websiteUrl || typeof websiteUrl !== "string") {
      return NextResponse.json(
        { error: "Website URL is required." },
        { status: 400 }
      );
    }

    let formattedUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    // 1. Fetch website HTML
    let htmlText = "";
    try {
      const pageRes = await fetch(formattedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (pageRes.ok) {
        const fullHtml = await pageRes.text();
        // Extract title, meta tags, and body text snippets
        const titleMatch = fullHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        const metaDescMatch = fullHtml.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
        );

        // Strip HTML tags for clean text excerpt
        const cleanText = fullHtml
          .replace(/<script\b[^<]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style\b[^<]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3000);

        htmlText = `Page Title: ${titleMatch?.[1] || "N/A"}
Meta Description: ${metaDescMatch?.[1] || "N/A"}
Content Excerpt: ${cleanText}`;
      }
    } catch {
      htmlText = `Website Domain: ${formattedUrl}`;
    }

    const systemPrompt = `You are an AI Business & Brand Intelligence Extractor.
Given a website domain and extracted page content, analyze the brand and return a structured JSON profile matching this exact schema:

{
  "name": "Brand Name",
  "industry": "One of ['E-commerce / Retail', 'SaaS / Software', 'Consumer apps', 'Health & wellness', 'Finance', 'Education', 'Food & beverage', 'Fashion & beauty', 'Travel', 'B2B services', 'Other']",
  "target_audience": "Clear description of target demographic",
  "brand_voice": "One of ['Bold & direct', 'Minimalist & premium', 'Friendly & conversational', 'Technical & authoritative', 'Playful & energetic', 'UGC & authentic']",
  "value_proposition": "Core benefit proposition",
  "price_range": "One of ['Budget (under $25)', 'Mid-range ($25–$100)', 'Premium ($100–$500)', 'Luxury ($500+)']",
  "campaign_goal": "One of ['Brand awareness', 'Traffic', 'Lead generation', 'Conversions / sales', 'App installs', 'Engagement']",
  "competitors": ["Top Competitor Brand 1", "Top Competitor Brand 2", "Top Competitor Brand 3"],
  "first_product": {
    "product_name": "Primary Product Name",
    "value_prop": "Product benefit",
    "price": "Estimated price string",
    "creative_hook": "High-converting ad hook suggestion"
  }
}

Return ONLY valid JSON.`;


    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract business profile for ${formattedUrl}:\n${htmlText}`,
          },
        ],
        temperature: 0.5,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json(
        { error: `Groq Extraction Error: ${errText}` },
        { status: groqRes.status }
      );
    }

    const groqData = await groqRes.json();
    const parsed = JSON.parse(groqData.choices?.[0]?.message?.content || "{}");

    return NextResponse.json({
      success: true,
      profile: parsed,
      websiteUrl: formattedUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to auto-discover business profile." },
      { status: 500 }
    );
  }
}

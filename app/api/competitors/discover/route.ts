import { NextResponse } from "next/server";

export interface DiscoveredCompetitor {
  name: string;
  website_url: string;
  primary_angle: string;
  overlap: string;
  predicted_ctr: number;
}

export async function POST(req: Request) {
  try {
    const { businessName, industry, targetAudience, website } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const prompt = `Analyze competitors for the following brand:
Brand Name: ${businessName}
Industry: ${industry || "E-commerce / Technology"}
Target Audience: ${targetAudience || "General Audience"}
Website: ${website || "N/A"}

Find 5 key industry competitors. Return a structured JSON response matching this schema:
{
  "competitors": [
    {
      "name": "Competitor Brand Name",
      "website_url": "https://competitor.com",
      "primary_angle": "Core advertising hook or positioning strategy",
      "overlap": "High / Medium / Direct Rival",
      "predicted_ctr": 1.45
    }
  ]
}`;

    const systemPrompt = `You are a Competitive Intelligence Agent for ad campaigns. 
Return ONLY a valid JSON object containing an array "competitors" of exactly 5 competitor objects.
Each competitor MUST have a realistic predicted_ctr between 0.8% and 2.5%.`;

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
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json(
        { error: `Groq Error: ${errText}` },
        { status: groqRes.status }
      );
    }

    const groqData = await groqRes.json();
    const parsed = JSON.parse(groqData.choices?.[0]?.message?.content || "{}");

    return NextResponse.json({
      competitors: parsed.competitors || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to discover competitors." },
      { status: 500 }
    );
  }
}

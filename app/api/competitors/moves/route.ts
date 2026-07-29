import { NextResponse } from "next/server";

export interface CompetitorMove {
  move_type: "ad_launched" | "price_change" | "positioning_pivot" | "hook_change";
  title: string;
  description: string;
  risk_level: "low" | "medium" | "high";
  predicted_ctr: number;
  timeAgo: string;
}

export async function POST(req: Request) {
  try {
    const { competitorName, primaryAngle } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const prompt = `Generate recent advertising moves, new campaign launches, and strategy pivots for competitor: ${competitorName} (Strategy: ${primaryAngle || "Direct competitor"}).

Return a structured JSON object containing an array "moves" of exactly 4 recent campaign moves matching this schema:
{
  "moves": [
    {
      "move_type": "ad_launched",
      "title": "Short action title",
      "description": "Explanation of the ad campaign shift or offer move",
      "risk_level": "high",
      "predicted_ctr": 1.65,
      "timeAgo": "2 hours ago"
    }
  ]
}`;

    const systemPrompt = `You are an Autonomous Ad Radar & Competitor Intelligence Agent.
Return ONLY valid JSON. Ensure risk_level is one of ['low', 'medium', 'high'] and move_type is one of ['ad_launched', 'price_change', 'positioning_pivot', 'hook_change'].`;

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
      moves: parsed.moves || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to analyze competitor moves." },
      { status: 500 }
    );
  }
}

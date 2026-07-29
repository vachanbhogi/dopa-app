import { NextResponse } from "next/server";
import { getApiAuth } from "@/utils/api-auth";
import { enforceApiQuota } from "@/utils/api-quota";
import { readJsonObjectRequest } from "@/utils/http-security";
import { isJsonObject, parseGroqJson, isUuid, stringValue } from "@/lib/validation";
import { fuseCampaignContext } from "@/lib/campaign-auto-launcher/context-fusion";
import type { AutoCampaignBlueprint, CampaignHook, AdConcept } from "@/types/campaign-launcher";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsedRequest = await readJsonObjectRequest(req, 16_384);
    if (!parsedRequest.success) return parsedRequest.response;

    const auth = await getApiAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Sign in before generating ad campaigns." },
        { status: 401 },
      );
    }

    const quotaResponse = await enforceApiQuota(
      auth.supabase,
      "keyword_generate",
    );
    if (quotaResponse) return quotaResponse;

    const body = parsedRequest.data;
    const businessId = stringValue(body.businessId, 100);
    const productId = body.productId ? stringValue(body.productId, 100) : undefined;

    if (!businessId || !isUuid(businessId)) {
      return NextResponse.json(
        { error: "A valid businessId is required." },
        { status: 400 },
      );
    }

    if (productId && !isUuid(productId)) {
      return NextResponse.json(
        { error: "Invalid productId specified." },
        { status: 400 },
      );
    }

    // 1. Fuse Multi-Source Context
    const context = await fuseCampaignContext(auth.supabase, businessId, productId);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI campaign generation is not configured yet (missing GROQ_API_KEY)." },
        { status: 503 },
      );
    }

    // Build rich context prompt
    const brandName = context.business.name;
    const productName = context.product?.name ?? brandName;
    const valueProp = context.product?.valueProp ?? context.business.valueProposition ?? "Industry leading solution";
    const priceStr = context.product?.price ? `$${context.product.price}` : "Premium pricing";
    const audience = context.business.targetAudience ?? "Target consumers";
    const competitorsText = context.competitors.length > 0
      ? context.competitors.map(c => `- ${c.name} (${c.relationship}): ${c.whyCompetitor}. Evidence: ${c.evidence.map(e => e.claim).join("; ")}`).join("\n")
      : "No direct competitor evidence available yet.";

    const systemPrompt = `You are Dopa's Elite Direct-Response Copywriter & UGC Performance Ad Strategist.
Your goal is to write REAL, HIGH-CONVERTING, NON-CORNY ad copy and hooks that sound like authentic human creators, elite media buyers, and top-performing DTC/SaaS founders.

CRITICAL COPYWRITING DIRECTIVE — ZERO AI CLICHÉS:
- BANNED WORDS & PHRASES: "Supercharge", "Unleash", "Game-changer", "Revolutionize", "Stop doing X in 2026", "Here is how X actually works", "Say goodbye to", "Are you tired of", "Elevate your", "Next-level", "Seamlessly", "In today's fast-paced world".
- Tone: Conversational, sharp, hyper-specific, grounded in real numbers and authentic pain points.

You MUST respond with a strict JSON object matching this schema:
{
  "positioningSummary": "1-2 sentence sharp, direct-response positioning summary identifying the core competitive arbitrage.",
  "hooks": [
    {
      "id": "hook-1",
      "archetype": "competitor_flaw",
      "archetypeLabel": "Competitor Counter-Positioning",
      "headline": "Why 80% of teams quit using [Competitor] after month 2",
      "hookScript": "If you're paying [Competitor] for X, you've probably noticed they hide the real cost behind per-seat add-ons...",
      "targetEmotion": "Vindication / Skepticism",
      "predictedCorticalImpactScore": 91,
      "rivalCountered": "[Competitor Name]",
      "angleReasoning": "Exposes hidden friction in rival pricing to capture dissatisfied buyers."
    }
  ],
  "keywordStrategy": {
    "highIntentCommercial": ["buy [product]", "[product] pricing", "best [product] for [audience]"],
    "problemSolution": ["how to fix [pain point]", "reduce [problem] cost"],
    "competitorConquesting": ["[competitor] alternative", "[competitor] vs [brand]"],
    "negativeKeywords": ["free", "crack", "torrent", "jobs", "salary", "reddit"],
    "suggestedDailyBudgetUsd": 75,
    "recommendedBiddingStrategy": "Maximize Conversions (Target CPA)"
  },
  "adConcepts": [
    {
      "channel": "google_rsa",
      "title": "Google Responsive Search Ads (RSA)",
      "googleSearchRsa": {
        "headlines": [
          "Switch from [Competitor]",
          "Cut Ad Burn by 40%",
          "Pre-Tested Ad Creatives",
          "Built for High-Scale Ads",
          "Try [Brand] Risk-Free"
        ],
        "descriptions": [
          "Stop burning budget on un-tested ads. Filter weak creatives before spending a dollar.",
          "Used by top performance marketers to predict average CTR with neural pre-testing."
        ],
        "callToAction": "Start Free Trial"
      }
    },
    {
      "channel": "short_video",
      "title": "TikTok / Reels Native UGC Script (15s)",
      "shortVideoScript": {
        "conceptName": "Green Screen Breakdown",
        "targetPlatform": "TikTok",
        "totalDurationSeconds": 15,
        "scenes": [
          {
            "timestamp": "0:00 - 0:03",
            "visualDirection": "Creator green-screened over a live screenshot of a competitor dashboard, pointing to the price tag",
            "audioScript": "Okay, I audited 10 performance ad accounts last week, and almost everyone was making this exact mistake.",
            "textOverlay": "Audited 10 Ad Accounts 🔍"
          },
          {
            "timestamp": "0:03 - 0:09",
            "visualDirection": "Cut to over-the-shoulder screen recording of [Brand] predicting CTR in 4 seconds",
            "audioScript": "Instead of burning $5k on live A/B testing, we run creatives through neural pre-testing first.",
            "textOverlay": "Neural Pre-Testing (No Budget Wasted) 🧠"
          },
          {
            "timestamp": "0:09 - 0:15",
            "visualDirection": "Creator points down to link banner with live graph overlay",
            "audioScript": "It filtered out our bottom 80% losers before spend. Link is in my bio if you want to try it.",
            "textOverlay": "Filter Losers BEFORE Spend 👇"
          }
        ]
      }
    },
    {
      "channel": "display_banner",
      "title": "Native Editorial Banner",
      "displayBanner": {
        "mainHeader": "Pre-Test Creatives Before Spend",
        "subHeader": "Predict average CTR and filter low-performing ads with neural cortical modeling.",
        "buttonCta": "See Live Score",
        "visualThemeDescription": "Minimalist high-contrast dark UI snippet showing a live 3.82% CTR score badge."
      }
    }
  ],
  "predictedAverageCtr": 4.65
}

REQUIREMENTS:
- Generate EXACTLY 5 distinct hooks (one for each archetype: 'competitor_flaw', 'pattern_interrupt', 'pain_payoff', 'aspiration', 'unfair_advantage').
- Archetype values MUST be one of: 'competitor_flaw', 'pattern_interrupt', 'pain_payoff', 'aspiration', 'unfair_advantage'.
- Tailor ALL copy specifically to the actual brand name, product features, price point, target audience, and rival evidence passed in the user prompt. NEVER use generic placeholders like '[Competitor]' in the final output; replace with real brand names and specific features.`;

    const userPrompt = `Brand Name: ${brandName}
Product Name: ${productName}
Value Proposition: ${valueProp}
Price Point: ${priceStr}
Target Audience: ${audience}

Tracked Competitors & Intelligence:
${competitorsText}`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
            { role: "user", content: userPrompt },
          ],
          temperature: 0.75,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "AI campaign generation is temporarily unavailable." },
        { status: 502 },
      );
    }

    const data: unknown = await response.json();
    const parsed = parseGroqJson(data);

    if (!isJsonObject(parsed) || !Array.isArray(parsed.hooks)) {
      throw new Error("Invalid campaign blueprint payload returned by AI model.");
    }

    const blueprint: AutoCampaignBlueprint = {
      id: `blueprint-${Date.now()}`,
      businessId,
      businessName: brandName,
      productId: context.product?.id,
      productName: context.product?.name,
      generatedAt: new Date().toISOString(),
      positioningSummary: stringValue(parsed.positioningSummary, 500) || "AI-Optimized Launch Blueprint",
      hooks: (parsed.hooks as CampaignHook[]).map((h, idx) => ({
        id: h.id || `hook-${idx + 1}`,
        archetype: h.archetype || "pattern_interrupt",
        archetypeLabel: h.archetypeLabel || "Pattern Interrupt",
        headline: stringValue(h.headline, 120) || "Attention-Grabbing Hook",
        hookScript: stringValue(h.hookScript, 500) || "",
        targetEmotion: stringValue(h.targetEmotion, 100) || "Curiosity",
        predictedCorticalImpactScore: typeof h.predictedCorticalImpactScore === "number" ? h.predictedCorticalImpactScore : 82,
        rivalCountered: h.rivalCountered ? stringValue(h.rivalCountered, 100) : undefined,
        angleReasoning: stringValue(h.angleReasoning, 300) || "",
      })),
      keywordStrategy: isJsonObject(parsed.keywordStrategy)
        ? {
            highIntentCommercial: Array.isArray(parsed.keywordStrategy.highIntentCommercial) ? parsed.keywordStrategy.highIntentCommercial.map(s => String(s)) : [],
            problemSolution: Array.isArray(parsed.keywordStrategy.problemSolution) ? parsed.keywordStrategy.problemSolution.map(s => String(s)) : [],
            competitorConquesting: Array.isArray(parsed.keywordStrategy.competitorConquesting) ? parsed.keywordStrategy.competitorConquesting.map(s => String(s)) : [],
            negativeKeywords: Array.isArray(parsed.keywordStrategy.negativeKeywords) ? parsed.keywordStrategy.negativeKeywords.map(s => String(s)) : [],
            suggestedDailyBudgetUsd: typeof parsed.keywordStrategy.suggestedDailyBudgetUsd === "number" ? parsed.keywordStrategy.suggestedDailyBudgetUsd : 50,
            recommendedBiddingStrategy: stringValue(parsed.keywordStrategy.recommendedBiddingStrategy, 100) || "Maximize Conversions",
          }
        : {
            highIntentCommercial: [],
            problemSolution: [],
            competitorConquesting: [],
            negativeKeywords: ["free"],
            suggestedDailyBudgetUsd: 50,
            recommendedBiddingStrategy: "Maximize Conversions",
          },
      adConcepts: (Array.isArray(parsed.adConcepts) ? parsed.adConcepts : []) as AdConcept[],
      predictedAverageCtr: typeof parsed.predictedAverageCtr === "number" ? parsed.predictedAverageCtr : 4.5,
      scoringStatus: "ready",
    };

    return NextResponse.json({ blueprint });
  } catch (error: unknown) {
    console.error("Auto campaign generation failed.", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: "Failed to generate campaign blueprint." },
      { status: 500 },
    );
  }
}

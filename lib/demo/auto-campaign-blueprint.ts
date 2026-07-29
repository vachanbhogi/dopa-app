import type { Business } from "@/lib/business-types";
import type { Product } from "@/lib/product-types";
import type {
  AdConcept,
  AutoCampaignBlueprint,
  CampaignHook,
  ClusteredKeywordStrategy,
} from "@/types/campaign-launcher";

function isAlibabaLike(business: Business): boolean {
  const blob = [
    business.name,
    business.website,
    business.industry,
    business.description,
    business.value_proposition,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    blob.includes("alibaba") ||
    blob.includes("b2b") ||
    blob.includes("wholesale") ||
    blob.includes("sourcing") ||
    blob.includes("marketplace")
  );
}

function rivalNames(business: Business): string[] {
  const fromField = (business.competitors ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromField.length > 0) return fromField.slice(0, 3);
  if (isAlibabaLike(business)) {
    return ["Amazon Business", "Global Sources", "Made-in-China.com"];
  }
  return ["Rival Labs", "Atlas Wear"];
}

function buildAlibabaHooks(
  brand: string,
  productName: string,
  rivals: string[],
): CampaignHook[] {
  const rival = rivals[0] ?? "Amazon Business";
  const rival2 = rivals[1] ?? "Global Sources";
  return [
    {
      id: "hook-1",
      archetype: "competitor_flaw",
      archetypeLabel: "Competitor Counter-Positioning",
      headline: `${rival} is fine for office supplies. Not for factory-direct wholesale.`,
      hookScript: `If you're sourcing custom MOQ from ${rival}, you've probably hit the wall — limited manufacturers, opaque lead times, no Trade Assurance. Here's what wholesale buyers actually use.`,
      targetEmotion: "Vindication / Frustration",
      predictedCorticalImpactScore: 88,
      rivalCountered: rival,
      angleReasoning:
        "Exposes B2B catalog limits vs true manufacturer marketplace depth.",
    },
    {
      id: "hook-2",
      archetype: "pattern_interrupt",
      archetypeLabel: "Pattern Interrupt",
      headline: "Stop emailing 40 suppliers. Let Accio do the shortlist.",
      hookScript: `Most importers still paste RFQs into WhatsApp groups. ${productName} on ${brand} researches, ranks, and drafts outreach in one pass.`,
      targetEmotion: "Curiosity / Relief",
      predictedCorticalImpactScore: 91,
      angleReasoning:
        "Interrupts manual sourcing habits with a concrete AI agent workflow.",
    },
    {
      id: "hook-3",
      archetype: "pain_payoff",
      archetypeLabel: "Pain → Payoff",
      headline: "One bad shipment can wipe a quarter. Protect the order.",
      hookScript:
        "Payment sent. Factory ghosts. Quality fails QC. Trade Assurance covers payment-to-delivery so one supplier miss doesn't sink the P&L.",
      targetEmotion: "Anxiety → Safety",
      predictedCorticalImpactScore: 86,
      angleReasoning:
        "Leads with wholesale downside risk, then order protection payoff.",
    },
    {
      id: "hook-4",
      archetype: "aspiration",
      archetypeLabel: "Aspiration",
      headline: "Source like a $50M importer — without the buying office.",
      hookScript: `${brand} gives SMEs verified manufacturers, AI shortlisting, and order protection used by global wholesale teams — without hiring a China desk.`,
      targetEmotion: "Ambition / Confidence",
      predictedCorticalImpactScore: 84,
      angleReasoning:
        "Positions marketplace + Accio as enterprise sourcing leverage for SMEs.",
    },
    {
      id: "hook-5",
      archetype: "unfair_advantage",
      archetypeLabel: "Unfair Advantage",
      headline: `Why buyers switch from ${rival2} after one Accio run.`,
      hookScript: `${rival2} directories are static. ${productName} keeps researching live supplier fit, MOQ, and messaging — then Trade Assurance closes the loop.`,
      targetEmotion: "FOMO / Edge",
      predictedCorticalImpactScore: 89,
      rivalCountered: rival2,
      angleReasoning:
        "Contrasts static directory UX with AI agent + protection stack.",
    },
  ];
}

function buildGenericHooks(
  brand: string,
  productName: string,
  valueProp: string,
  rivals: string[],
): CampaignHook[] {
  const rival = rivals[0] ?? "competitors";
  return [
    {
      id: "hook-1",
      archetype: "competitor_flaw",
      archetypeLabel: "Competitor Counter-Positioning",
      headline: `What ${rival} buyers complain about after month one`,
      hookScript: `If you're comparing ${brand} to ${rival}, start here: ${valueProp}. Most switchers cite the same gap.`,
      targetEmotion: "Skepticism / Vindication",
      predictedCorticalImpactScore: 85,
      rivalCountered: rival,
      angleReasoning: "Counter-positions against the top tracked rival.",
    },
    {
      id: "hook-2",
      archetype: "pattern_interrupt",
      archetypeLabel: "Pattern Interrupt",
      headline: `Don't launch ${productName} the way everyone else does`,
      hookScript: `Skip the soft CTA montage. Lead with the proof: ${valueProp}.`,
      targetEmotion: "Curiosity",
      predictedCorticalImpactScore: 87,
      angleReasoning: "Breaks category creative patterns with a proof-first hook.",
    },
    {
      id: "hook-3",
      archetype: "pain_payoff",
      archetypeLabel: "Pain → Payoff",
      headline: "The expensive mistake most buyers make before they find us",
      hookScript: `Burning budget on the wrong creative angle. ${productName} is built so the first impression matches ${valueProp}.`,
      targetEmotion: "Relief",
      predictedCorticalImpactScore: 84,
      angleReasoning: "Pain of wasted spend → clear product payoff.",
    },
    {
      id: "hook-4",
      archetype: "aspiration",
      archetypeLabel: "Aspiration",
      headline: `Built for buyers who outgrew ${rival}`,
      hookScript: `${brand} is for teams that want ${valueProp} — without the markup or the compromise.`,
      targetEmotion: "Ambition",
      predictedCorticalImpactScore: 82,
      rivalCountered: rival,
      angleReasoning: "Aspirational upgrade framing vs status-quo rival.",
    },
    {
      id: "hook-5",
      archetype: "unfair_advantage",
      archetypeLabel: "Unfair Advantage",
      headline: `The ${productName} edge ${rival} can't copy`,
      hookScript: valueProp,
      targetEmotion: "FOMO / Edge",
      predictedCorticalImpactScore: 88,
      rivalCountered: rival,
      angleReasoning: "Leads with distinctive value prop as moat.",
    },
  ];
}

function buildKeywordStrategy(
  business: Business,
  productName: string,
  rivals: string[],
): ClusteredKeywordStrategy {
  if (isAlibabaLike(business)) {
    return {
      highIntentCommercial: [
        "B2B wholesale marketplace",
        "source manufacturers online",
        "Accio AI sourcing",
        "Alibaba Trade Assurance",
        `${productName.toLowerCase()}`,
      ],
      problemSolution: [
        "how to find verified suppliers",
        "reduce sourcing lead time",
        "wholesale order protection",
        "AI product sourcing agent",
      ],
      competitorConquesting: rivals.map((r) => `${r.toLowerCase()} alternative`),
      negativeKeywords: [
        "retail",
        "jobs",
        "salary",
        "login",
        "tee shirt",
        "apparel",
      ],
      suggestedDailyBudgetUsd: 120,
      recommendedBiddingStrategy: "Maximize Conversions (Target CPA)",
    };
  }

  return {
    highIntentCommercial: [
      `buy ${productName.toLowerCase()}`,
      `${productName.toLowerCase()} pricing`,
      `best ${productName.toLowerCase()}`,
    ],
    problemSolution: [
      `how to choose ${productName.toLowerCase()}`,
      `${business.industry ?? "brand"} alternatives`,
    ],
    competitorConquesting: rivals.map((r) => `${r.toLowerCase()} alternative`),
    negativeKeywords: ["free", "jobs", "salary", "reddit", "cheap knockoff"],
    suggestedDailyBudgetUsd: 75,
    recommendedBiddingStrategy: "Maximize Conversions",
  };
}

function buildAdConcepts(
  brand: string,
  productName: string,
  valueProp: string,
  rivals: string[],
  alibaba: boolean,
): AdConcept[] {
  const rival = rivals[0] ?? "competitors";

  if (alibaba) {
    return [
      {
        channel: "google_rsa",
        title: "Google Responsive Search Ads (RSA)",
        googleSearchRsa: {
          headlines: [
            "Source Verified Manufacturers",
            "AI Sourcing with Accio",
            "Trade Assurance Protection",
            `Switch from ${rival}`,
            "Wholesale. Factory-Direct.",
            "Global B2B Marketplace",
          ],
          descriptions: [
            "Connect with audited suppliers, shortlist with Accio, and protect orders with Trade Assurance.",
            `${valueProp}`,
          ],
          callToAction: "Start Sourcing",
        },
      },
      {
        channel: "short_video",
        title: "LinkedIn / Shorts Buyer Script (15s)",
        shortVideoScript: {
          conceptName: "RFQ Overwhelm → Accio Shortlist",
          targetPlatform: "YouTube Shorts",
          totalDurationSeconds: 15,
          scenes: [
            {
              timestamp: "0:00 - 0:03",
              visualDirection:
                "Buyer scrolling endless supplier chat threads and Excel RFQ tabs",
              audioScript:
                "If your inbox is 40 half-replies and zero clear MOQs, you're sourcing the hard way.",
              textOverlay: "40 supplier threads 😩",
            },
            {
              timestamp: "0:03 - 0:09",
              visualDirection:
                "Screen recording of Accio researching and ranking suppliers on Alibaba.com",
              audioScript:
                "Accio researches, ranks, and drafts outreach — so you talk to factories that actually fit.",
              textOverlay: "Accio AI shortlist ✅",
            },
            {
              timestamp: "0:09 - 0:15",
              visualDirection:
                "Trade Assurance badge + order confirmation UI, cut to CTA",
              audioScript:
                "Then Trade Assurance covers payment to delivery. Link below if you source wholesale.",
              textOverlay: "Protected orders →",
            },
          ],
        },
      },
      {
        channel: "display_banner",
        title: "Native B2B Banner",
        displayBanner: {
          mainHeader: "Source Smarter. Buy Safer.",
          subHeader:
            "AI sourcing + verified manufacturers + Trade Assurance on Alibaba.com.",
          buttonCta: "Try Accio Free",
          visualThemeDescription:
            "Clean marketplace UI with Accio chat panel and green Trade Assurance shield — no apparel lifestyle imagery.",
        },
      },
    ];
  }

  return [
    {
      channel: "google_rsa",
      title: "Google Responsive Search Ads (RSA)",
      googleSearchRsa: {
        headlines: [
          `${productName} — ${brand}`,
          `Why Teams Leave ${rival}`,
          valueProp.slice(0, 30) || brand,
          `Try ${brand}`,
          "Pre-Tested Creative Angles",
        ],
        descriptions: [
          valueProp,
          `Compare ${brand} against ${rival} before you scale spend.`,
        ],
        callToAction: "Learn More",
      },
    },
    {
      channel: "short_video",
      title: "TikTok / Reels Native UGC Script (15s)",
      shortVideoScript: {
        conceptName: "Proof-First Hook",
        targetPlatform: "TikTok",
        totalDurationSeconds: 15,
        scenes: [
          {
            timestamp: "0:00 - 0:03",
            visualDirection: "Creator holds product / points at screen",
            audioScript: `Okay — if you're still buying like ${rival}, watch this.`,
            textOverlay: "Before you scale spend",
          },
          {
            timestamp: "0:03 - 0:09",
            visualDirection: "Product demo or feature close-up",
            audioScript: valueProp,
            textOverlay: productName,
          },
          {
            timestamp: "0:09 - 0:15",
            visualDirection: "CTA with brand mark",
            audioScript: `That's ${brand}. Link in bio.`,
            textOverlay: "Try it →",
          },
        ],
      },
    },
    {
      channel: "display_banner",
      title: "Native Editorial Banner",
      displayBanner: {
        mainHeader: productName,
        subHeader: valueProp,
        buttonCta: "See Campaign",
        visualThemeDescription: `Brand-forward creative for ${brand}, product-led, no generic stock lifestyle.`,
      },
    },
  ];
}

/** Local demo blueprint — no API / auth required. */
export function buildDemoAutoCampaignBlueprint(input: {
  business: Business;
  product?: Product | null;
}): AutoCampaignBlueprint {
  const { business, product } = input;
  const brand = business.name || "Demo brand";
  const productName = product?.product_name?.trim() || brand;
  const valueProp =
    product?.value_prop?.trim() ||
    business.value_proposition?.trim() ||
    "Clear value for your buyers.";
  const rivals = rivalNames(business);
  const alibaba = isAlibabaLike(business);

  const hooks = alibaba
    ? buildAlibabaHooks(brand, productName, rivals)
    : buildGenericHooks(brand, productName, valueProp, rivals);

  const positioningSummary = alibaba
    ? `${brand} wins wholesale demand by pairing AI sourcing (${productName}) with verified suppliers and order protection — a clearer B2B story than catalog-only rivals like ${rivals[0] ?? "Amazon Business"}.`
    : `${brand} positions ${productName} around ${valueProp} — countering ${rivals[0] ?? "category rivals"} with sharper proof-led creative.`;

  return {
    id: `demo-blueprint-${Date.now()}`,
    businessId: business.id,
    businessName: brand,
    productId: product?.id,
    productName: product ? productName : undefined,
    generatedAt: new Date().toISOString(),
    positioningSummary,
    hooks,
    keywordStrategy: buildKeywordStrategy(business, productName, rivals),
    adConcepts: buildAdConcepts(brand, productName, valueProp, rivals, alibaba),
    predictedAverageCtr: alibaba ? 3.42 : 2.96,
    scoringStatus: "ready",
  };
}

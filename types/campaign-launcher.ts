export type HookArchetype =
  | "competitor_flaw"
  | "pattern_interrupt"
  | "pain_payoff"
  | "aspiration"
  | "unfair_advantage";

export interface CampaignHook {
  id: string;
  archetype: HookArchetype;
  archetypeLabel: string;
  headline: string;
  hookScript: string;
  targetEmotion: string;
  predictedCorticalImpactScore: number;
  rivalCountered?: string;
  angleReasoning: string;
}

export interface ClusteredKeywordStrategy {
  highIntentCommercial: string[];
  problemSolution: string[];
  competitorConquesting: string[];
  negativeKeywords: string[];
  suggestedDailyBudgetUsd: number;
  recommendedBiddingStrategy: string;
}

export interface VideoScene {
  timestamp: string;
  visualDirection: string;
  audioScript: string;
  textOverlay: string;
}

export interface AdConcept {
  channel: "google_rsa" | "short_video" | "display_banner";
  title: string;
  googleSearchRsa?: {
    headlines: string[];
    descriptions: string[];
    callToAction: string;
  };
  shortVideoScript?: {
    conceptName: string;
    targetPlatform: "TikTok" | "Instagram Reels" | "YouTube Shorts";
    totalDurationSeconds: number;
    scenes: VideoScene[];
  };
  displayBanner?: {
    mainHeader: string;
    subHeader: string;
    buttonCta: string;
    visualThemeDescription: string;
  };
}

export interface AutoCampaignBlueprint {
  id: string;
  businessId: string;
  businessName: string;
  productId?: string;
  productName?: string;
  generatedAt: string;
  
  // Strategy & Hooks
  positioningSummary: string;
  hooks: CampaignHook[];

  // Keywords
  keywordStrategy: ClusteredKeywordStrategy;

  // Ad Creative Concepts
  adConcepts: AdConcept[];

  // Performance Prediction
  predictedAverageCtr: number;
  scoringStatus: "ready" | "tribe_scored" | "deployed";
}

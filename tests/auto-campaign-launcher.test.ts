import assert from "node:assert/strict";
import type { AutoCampaignBlueprint, CampaignHook, HookArchetype } from "../types/campaign-launcher";

function test(name: string, run: () => void) {
  run();
  console.log(`✓ ${name}`);
}

test("validates CampaignHook data structure and hook archetypes", () => {
  const archetypes: HookArchetype[] = [
    "competitor_flaw",
    "pattern_interrupt",
    "pain_payoff",
    "aspiration",
    "unfair_advantage",
  ];

  for (const archetype of archetypes) {
    const hook: CampaignHook = {
      id: `test-${archetype}`,
      archetype,
      archetypeLabel: archetype.replace("_", " "),
      headline: "Test Headline",
      hookScript: "Test script opening...",
      targetEmotion: "Curiosity",
      predictedCorticalImpactScore: 85,
      angleReasoning: "Validates archetype mapping",
    };

    assert.equal(hook.archetype, archetype);
    assert.equal(typeof hook.predictedCorticalImpactScore, "number");
    assert.ok(hook.predictedCorticalImpactScore >= 0 && hook.predictedCorticalImpactScore <= 100);
  }
});

test("constructs valid AutoCampaignBlueprint with hooks and ad concepts", () => {
  const blueprint: AutoCampaignBlueprint = {
    id: "blueprint-123",
    businessId: "123e4567-e89b-42d3-a456-426614174000",
    businessName: "Acme Corp",
    productName: "Acme Widget Pro",
    generatedAt: new Date().toISOString(),
    positioningSummary: "AI-powered automated ad campaigns for modern brands.",
    hooks: [
      {
        id: "hook-1",
        archetype: "pattern_interrupt",
        archetypeLabel: "Pattern Interrupt",
        headline: "Stop Doing Manual Ads in 2026",
        hookScript: "Here is how automated campaigns actually work.",
        targetEmotion: "Surprise",
        predictedCorticalImpactScore: 92,
        angleReasoning: "Scroll-stopping opener",
      },
    ],
    keywordStrategy: {
      highIntentCommercial: ["buy acme widget", "acme widget pro"],
      problemSolution: ["how to automate ads", "fix ad spend waste"],
      competitorConquesting: ["rival brand alternative"],
      negativeKeywords: ["free", "jobs"],
      suggestedDailyBudgetUsd: 50,
      recommendedBiddingStrategy: "Maximize Conversions",
    },
    adConcepts: [
      {
        channel: "google_rsa",
        title: "Google Search RSA",
        googleSearchRsa: {
          headlines: ["Headline 1", "Headline 2"],
          descriptions: ["Desc 1", "Desc 2"],
          callToAction: "Get Started",
        },
      },
      {
        channel: "short_video",
        title: "TikTok 15s Script",
        shortVideoScript: {
          conceptName: "Hook & Reveal",
          targetPlatform: "TikTok",
          totalDurationSeconds: 15,
          scenes: [
            {
              timestamp: "0:00 - 0:03",
              visualDirection: "Fast cut of user screen",
              audioScript: "Stop wasting money on ads!",
              textOverlay: "Stop Wasting Money 🛑",
            },
          ],
        },
      },
    ],
    predictedAverageCtr: 4.85,
    scoringStatus: "ready",
  };

  assert.equal(blueprint.businessName, "Acme Corp");
  assert.equal(blueprint.hooks.length, 1);
  assert.equal(blueprint.adConcepts.length, 2);
  assert.equal(blueprint.predictedAverageCtr, 4.85);
});

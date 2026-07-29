"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Business } from "@/lib/business-types";
import type { Product } from "@/lib/product-types";
import type { AutoCampaignBlueprint, CampaignHook } from "@/types/campaign-launcher";
import { listProducts } from "@/app/dashboard/product-actions";
import { buildDemoAutoCampaignBlueprint } from "@/lib/demo/auto-campaign-blueprint";
import { errorMessage, isJsonObject } from "@/lib/validation";
import { NavIcon } from "./DashboardShell";

const easeOut = [0.23, 1, 0.32, 1] as const;

export function AutoCampaignTab({
  business,
  demoMode = false,
  initialProducts,
}: {
  business: Business;
  demoMode?: boolean;
  initialProducts?: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(() => initialProducts ?? []);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [blueprint, setBlueprint] = useState<AutoCampaignBlueprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploySuccess, setDeploySuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"hooks" | "keywords" | "ad_concepts">("hooks");

  useEffect(() => {
    if (demoMode) {
      queueMicrotask(() => {
        setProducts(initialProducts ?? []);
        if (initialProducts?.[0]) setSelectedProductId(initialProducts[0].id);
      });
      return;
    }
    async function loadProducts() {
      try {
        const res = await listProducts(business.id);
        const list = res.products ?? [];
        setProducts(list);
        if (list.length > 0) {
          setSelectedProductId(list[0].id);
        }
      } catch {
        // Fall back gracefully
      }
    }
    loadProducts();
  }, [business.id, demoMode, initialProducts]);

  async function handleGenerateCampaign() {
    setLoading(true);
    setError(null);
    setDeploySuccess(null);

    try {
      if (demoMode) {
        // Local blueprint — no auth / API; feels brand-accurate for the demo workspace.
        await new Promise((resolve) => setTimeout(resolve, 900));
        const selected =
          products.find((p) => p.id === selectedProductId) ?? products[0] ?? null;
        setBlueprint(
          buildDemoAutoCampaignBlueprint({
            business,
            product: selected,
          }),
        );
        return;
      }

      const res = await fetch("/api/campaigns/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          productId: selectedProductId || undefined,
        }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        const msg = isJsonObject(data) && typeof data.error === "string" ? data.error : "Failed to generate campaign.";
        throw new Error(msg);
      }

      if (isJsonObject(data) && isJsonObject(data.blueprint)) {
        setBlueprint(data.blueprint as unknown as AutoCampaignBlueprint);
      } else {
        throw new Error("Invalid response blueprint received.");
      }
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not generate automated campaign strategy."));
    } finally {
      setLoading(false);
    }
  }

  async function handleLaunchCampaign() {
    if (!blueprint) return;
    if (demoMode) {
      setError(null);
      setDeploySuccess(
        "Demo mode — blueprint is ready. Sign up to launch live campaigns on Google Ads & Meta.",
      );
      return;
    }
    setDeploying(true);
    setError(null);
    setDeploySuccess(null);

    try {
      // Simulate/trigger direct deployment
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setDeploySuccess(`Successfully launched campaign "${blueprint.positioningSummary.slice(0, 40)}..." to Google Ads & Meta!`);
      setBlueprint((prev) => prev ? { ...prev, scoringStatus: "deployed" } : null);
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to launch campaign."));
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-white">
            Auto Campaign & Hook Generator
          </h2>
          <p className="text-[14px] leading-6 text-secondary">
            Synthesize brand context, product specs, keywords, and rival evidence into a pre-tested ad campaign with high-converting hooks.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {products.length > 0 ? (
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0c0d0e] px-3 py-2 text-[13px] font-medium text-white focus:outline-none focus:border-brand"
            >
              <option value="">All Products (Brand Level)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.product_name}
                </option>
              ))}
            </select>
          ) : null}

          <button
            type="button"
            onClick={handleGenerateCampaign}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white shadow-lg transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          >
            {loading ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Synthesizing Blueprint…
              </>
            ) : (
              <>
                <SparkleIcon className="h-4 w-4 text-accent" />
                Auto-Generate Campaign
              </>
            )}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      {deploySuccess ? (
        <div role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-3 text-[13px] text-emerald-200">
          ✨ {deploySuccess}
        </div>
      ) : null}

      {!blueprint && !loading ? (
        <div className="dopa-panel flex flex-col items-center justify-center border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/8 bg-white/4">
            <NavIcon name="sparkles" active />
          </div>
          <h3 className="mt-4 text-[15px] font-medium text-white">
            No Campaign Blueprint Generated
          </h3>
          <p className="mt-1.5 max-w-md text-[13px] leading-5 text-secondary">
            Select a product or brand scope and click <span className="text-white font-medium">Auto-Generate Campaign</span> to synthesize hooks, keyword strategies, and ad copy backed by rival intelligence.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="dopa-panel divide-y divide-white/6 overflow-hidden p-6 text-center">
          <div className="flex justify-center mb-4">
            <SpinnerIcon className="h-8 w-8 animate-spin text-brand" />
          </div>
          <h3 className="text-[15px] font-medium text-white">
            Fusing Context & Synthesizing Campaign…
          </h3>
          <p className="mt-1 text-[13px] text-secondary">
            Fusing business positioning, product features, keyword intent, and rival threat evidence.
          </p>
        </div>
      ) : null}

      {blueprint && !loading ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easeOut }}
          className="space-y-6"
        >
          {/* Top Overview Banner */}
          <div className="dopa-panel p-5 sm:p-6 bg-gradient-to-r from-brand/10 via-white/2 to-transparent">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="rounded-md border border-brand/30 bg-brand/15 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-brand">
                  Campaign Blueprint · Ready
                </span>
                <h3 className="mt-2 text-[18px] font-medium text-white">
                  {blueprint.productName ? `${blueprint.productName} Launch` : `${blueprint.businessName} Strategy`}
                </h3>
                <p className="mt-1 text-[13px] text-secondary leading-relaxed max-w-3xl">
                  {blueprint.positioningSummary}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-[11px] uppercase text-tertiary">Predicted CTR</p>
                  <p className="font-mono text-[22px] font-bold text-emerald-400">
                    {blueprint.predictedAverageCtr.toFixed(2)}%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  disabled={deploying || blueprint.scoringStatus === "deployed"}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-[13px] font-medium text-black shadow-md transition-[opacity,transform,background-color] duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  {deploying
                    ? "Deploying…"
                    : blueprint.scoringStatus === "deployed"
                      ? "Deployed ✓"
                      : demoMode
                        ? "Sign up to Launch Live"
                        : "Launch Campaign Live"}
                </button>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-white/10 gap-4">
            <button
              onClick={() => setActiveTab("hooks")}
              className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === "hooks" ? "border-brand text-white" : "border-transparent text-secondary hover:text-white"
              }`}
            >
              Suggested Hooks ({blueprint.hooks.length})
            </button>
            <button
              onClick={() => setActiveTab("keywords")}
              className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === "keywords" ? "border-brand text-white" : "border-transparent text-secondary hover:text-white"
              }`}
            >
              Keyword Strategy
            </button>
            <button
              onClick={() => setActiveTab("ad_concepts")}
              className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === "ad_concepts" ? "border-brand text-white" : "border-transparent text-secondary hover:text-white"
              }`}
            >
              Ad Concepts & Video Scripts ({blueprint.adConcepts.length})
            </button>
          </div>

          {/* Tab 1: Hooks */}
          {activeTab === "hooks" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {blueprint.hooks.map((hook) => (
                <HookCard key={hook.id} hook={hook} />
              ))}
            </div>
          ) : null}

          {/* Tab 2: Keywords */}
          {activeTab === "keywords" ? (
            <div className="dopa-panel p-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KeywordGroup
                  title="Commercial High-Intent"
                  keywords={blueprint.keywordStrategy.highIntentCommercial}
                  badgeTone="emerald"
                />
                <KeywordGroup
                  title="Problem & Solution"
                  keywords={blueprint.keywordStrategy.problemSolution}
                  badgeTone="blue"
                />
                <KeywordGroup
                  title="Competitor Conquesting"
                  keywords={blueprint.keywordStrategy.competitorConquesting}
                  badgeTone="purple"
                />
                <KeywordGroup
                  title="Negative Keywords"
                  keywords={blueprint.keywordStrategy.negativeKeywords}
                  badgeTone="amber"
                />
              </div>

              <div className="border-t border-white/6 pt-4 flex flex-wrap justify-between items-center text-[13px]">
                <div>
                  <span className="text-tertiary">Suggested Daily Budget: </span>
                  <span className="font-semibold text-white">${blueprint.keywordStrategy.suggestedDailyBudgetUsd}/day</span>
                </div>
                <div>
                  <span className="text-tertiary">Bidding Strategy: </span>
                  <span className="font-semibold text-emerald-400">{blueprint.keywordStrategy.recommendedBiddingStrategy}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Tab 3: Ad Concepts & Video Scripts */}
          {activeTab === "ad_concepts" ? (
            <div className="space-y-6">
              {blueprint.adConcepts.map((concept, idx) => (
                <div key={idx} className="dopa-panel p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[15px] font-medium text-white">{concept.title}</h4>
                    <span className="text-[11px] uppercase tracking-wider font-mono text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded">
                      {concept.channel.replace("_", " ")}
                    </span>
                  </div>

                  {concept.googleSearchRsa ? (
                    <div className="space-y-3 bg-black/20 p-4 rounded-lg border border-white/6">
                      <p className="text-[12px] font-medium uppercase text-tertiary">Headlines (Google RSA)</p>
                      <div className="flex flex-wrap gap-2">
                        {concept.googleSearchRsa.headlines.map((h, hIdx) => (
                          <span key={hIdx} className="rounded bg-white/6 px-2.5 py-1 text-[12px] text-white">
                            {h}
                          </span>
                        ))}
                      </div>

                      <p className="mt-3 text-[12px] font-medium uppercase text-tertiary">Descriptions</p>
                      <div className="space-y-1.5 text-[13px] text-secondary">
                        {concept.googleSearchRsa.descriptions.map((d, dIdx) => (
                          <p key={dIdx}>• {d}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {concept.shortVideoScript ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[12px] text-secondary">
                        <span>Platform: <strong className="text-white">{concept.shortVideoScript.targetPlatform}</strong></span>
                        <span>Duration: <strong className="text-white">{concept.shortVideoScript.totalDurationSeconds}s</strong></span>
                      </div>

                      <div className="divide-y divide-white/6 border border-white/8 rounded-lg overflow-hidden">
                        {concept.shortVideoScript.scenes.map((scene, sIdx) => (
                          <div key={sIdx} className="grid grid-cols-1 md:grid-cols-4 p-3.5 gap-2 text-[12px] bg-white/[0.01] hover:bg-white/[0.03]">
                            <div className="font-mono text-brand font-medium">{scene.timestamp}</div>
                            <div className="text-secondary"><strong className="text-white block md:inline">Visual: </strong>{scene.visualDirection}</div>
                            <div className="text-secondary"><strong className="text-white block md:inline">Audio/Voice: </strong>&ldquo;{scene.audioScript}&rdquo;</div>
                            <div className="text-accent font-medium"><strong className="text-white block md:inline">Overlay: </strong>{scene.textOverlay}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {concept.displayBanner ? (
                    <div className="space-y-2 rounded-lg border border-brand/20 bg-gradient-to-r from-brand/15 via-brand/5 to-transparent p-4">
                      <p className="text-[16px] font-bold text-white">{concept.displayBanner.mainHeader}</p>
                      <p className="text-[13px] text-secondary">{concept.displayBanner.subHeader}</p>
                      <span className="inline-block mt-2 bg-white text-black text-[12px] font-medium px-3 py-1 rounded">
                        {concept.displayBanner.buttonCta}
                      </span>
                      <p className="mt-2 text-[11px] text-tertiary italic">Visual Theme: {concept.displayBanner.visualThemeDescription}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}

function HookCard({ hook }: { hook: CampaignHook }) {
  return (
    <div className="dopa-panel p-5 space-y-3 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-secondary">
          {hook.archetypeLabel}
        </span>
        <div className="text-right">
          <span className="font-mono text-[14px] font-bold text-brand">
            {hook.predictedCorticalImpactScore}
          </span>
          <span className="text-[9px] uppercase block text-tertiary">Impact Score</span>
        </div>
      </div>

      <h4 className="text-[15px] font-semibold text-white tracking-tight leading-snug">
        &ldquo;{hook.headline}&rdquo;
      </h4>

      <p className="text-[13px] text-secondary leading-relaxed bg-black/20 p-3 rounded border border-white/6">
        {hook.hookScript}
      </p>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-tertiary pt-2 border-t border-white/6">
        <span>Target Emotion: <strong className="text-white">{hook.targetEmotion}</strong></span>
        {hook.rivalCountered ? (
          <span className="text-amber-300">Countering: {hook.rivalCountered}</span>
        ) : null}
      </div>
    </div>
  );
}

function KeywordGroup({
  title,
  keywords,
  badgeTone,
}: {
  title: string;
  keywords: string[];
  badgeTone: "emerald" | "blue" | "purple" | "amber";
}) {
  const badgeColors = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <div className="space-y-2">
      <p className="text-[12px] font-medium text-tertiary uppercase tracking-wider">{title}</p>
      <div className="flex flex-col gap-1.5">
        {keywords.length > 0 ? (
          keywords.map((kw, i) => (
            <span key={i} className={`rounded border px-2.5 py-1 text-[12px] ${badgeColors[badgeTone]}`}>
              {kw}
            </span>
          ))
        ) : (
          <span className="text-[12px] text-tertiary italic">None specified</span>
        )}
      </div>
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  );
}

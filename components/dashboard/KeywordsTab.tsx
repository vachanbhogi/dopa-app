"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "motion/react";
import { listProducts } from "@/app/dashboard/product-actions";
import type { Business } from "@/lib/business-types";
import type {
  KeywordRecommendation,
  KeywordResearchRunDto,
  KeywordResearchStage,
  KeywordSourceMode,
} from "@/lib/keyword-intelligence/types";
import type { Product } from "@/lib/product-types";
import { errorMessage, isJsonObject } from "@/lib/validation";
import { NavIcon } from "./DashboardShell";

type KeywordMetric = {
  keyword: string;
  avgMonthlySearches: number;
  cpcFormatted?: string;
};

const stageCopy: Record<KeywordResearchStage, string> = {
  queued: "Waiting for the research worker",
  searching: "Reading the source and searching customer language",
  synthesizing: "Comparing current phrases with higher-intent searches",
  finalizing: "Checking evidence and ranking recommendations",
  completed: "Keyword research complete",
  failed: "Keyword research needs attention",
};

const statusStyles: Record<
  KeywordRecommendation["status"],
  { label: string; className: string }
> = {
  keep: {
    label: "Keep",
    className: "border-emerald-300/20 bg-emerald-300/8 text-emerald-200",
  },
  improve: {
    label: "Improve",
    className: "border-amber-300/20 bg-amber-300/8 text-amber-100",
  },
  add: {
    label: "Add",
    className: "border-indigo-300/20 bg-indigo-300/8 text-indigo-100",
  },
};

const profileDetails: Array<{
  key: keyof Business;
  label: string;
}> = [
  { key: "website", label: "Website" },
  { key: "industry", label: "Industry" },
  { key: "description", label: "Description" },
  { key: "target_audience", label: "Audience" },
  { key: "value_proposition", label: "Value prop" },
  { key: "markets", label: "Markets" },
  { key: "campaign_goal", label: "Campaign goal" },
  { key: "target_keywords", label: "Core keywords" },
];

function metricsFromResponse(value: unknown): Record<string, KeywordMetric> {
  if (!isJsonObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, metric]) => {
      if (
        !isJsonObject(metric) ||
        typeof metric.keyword !== "string" ||
        typeof metric.avgMonthlySearches !== "number"
      ) {
        return [];
      }
      return [
        [
          key,
          {
            keyword: metric.keyword,
            avgMonthlySearches: metric.avgMonthlySearches,
            cpcFormatted:
              typeof metric.cpcFormatted === "string"
                ? metric.cpcFormatted
                : undefined,
          },
        ],
      ];
    }),
  );
}

export function KeywordsTab({ business }: { business: Business }) {
  const [sourceMode, setSourceMode] = useState<KeywordSourceMode>("profile");
  const [sourceUrl, setSourceUrl] = useState(business.website ?? "");
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [run, setRun] = useState<KeywordResearchRunDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, KeywordMetric>>({});
  const [metricsConnected, setMetricsConnected] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const loadResearch = useCallback(async () => {
    const response = await fetch(
      `/api/keywords/research?businessId=${encodeURIComponent(business.id)}`,
      { cache: "no-store" },
    );
    const data: unknown = await response.json();
    if (!response.ok || !isJsonObject(data)) {
      throw new Error(
        isJsonObject(data) && typeof data.error === "string"
          ? data.error
          : "Could not load keyword research.",
      );
    }
    setRun((data.run as KeywordResearchRunDto | null) ?? null);
  }, [business.id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      setLoading(true);
      setError(null);
      try {
        const [productResult] = await Promise.all([
          listProducts(business.id),
          loadResearch(),
        ]);
        if (!active) return;
        if (productResult.error) throw new Error(productResult.error);
        setProducts(productResult.products ?? []);
      } catch (loadError) {
        if (active) {
          setError(
            errorMessage(loadError, "Could not load keyword research."),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [business.id, loadResearch]);

  useEffect(() => {
    if (run?.status !== "queued" && run?.status !== "running") return;
    const timer = window.setInterval(() => {
      void loadResearch().catch(() => undefined);
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [loadResearch, run?.status]);

  useEffect(() => {
    if (run?.status !== "completed" || run.recommendations.length === 0) {
      return;
    }
    const controller = new AbortController();
    fetch("/api/keywords/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: run.recommendations.map((item) => item.keyword),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok || !isJsonObject(data)) return;
        setMetrics(metricsFromResponse(data.metrics));
        setMetricsConnected(data.connected === true);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [run?.id, run?.recommendations, run?.status]);

  const availableProfileDetails = useMemo(
    () =>
      profileDetails.filter(({ key }) => {
        const value = business[key];
        return typeof value === "string" && value.trim();
      }),
    [business],
  );
  const selectedProduct = products.find((product) => product.id === productId);
  const activeRun = run?.status === "queued" || run?.status === "running";

  async function startResearch() {
    setResearching(true);
    setError(null);
    setNotice(null);
    setMetrics({});
    setMetricsConnected(null);
    try {
      const response = await fetch("/api/keywords/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          sourceMode,
          sourceUrl: sourceMode === "url" ? sourceUrl : undefined,
          productId: productId || undefined,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isJsonObject(data) && typeof data.error === "string"
            ? data.error
            : "Could not start keyword research.",
        );
      }
      setNotice(
        isJsonObject(data) && data.existing === true
          ? "Research is already running for this business."
          : "Research queued. You can leave this tab while Dopa works.",
      );
      await loadResearch();
    } catch (researchError) {
      setError(
        errorMessage(researchError, "Could not start keyword research."),
      );
    } finally {
      setResearching(false);
    }
  }

  async function copyHeadline(headline: string) {
    try {
      await navigator.clipboard.writeText(headline);
      setCopied(headline);
      window.setTimeout(() => setCopied(null), 2_000);
    } catch {
      setError("Your browser blocked clipboard access.");
    }
  }

  return (
    <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-5">
      <div className="max-w-2xl">
        <h2 className="text-[15px] font-medium text-white">
          Keyword Research
        </h2>
        <p className="mt-1 text-[14px] leading-6 text-secondary">
          Pull keyword ideas and feedback from information you already have.
          Import a public website or LinkedIn URL, or use your saved Dopa
          business profile.
        </p>
      </div>

      <section className="dopa-panel overflow-hidden">
        <div className="grid border-b border-white/6 md:grid-cols-2">
          <SourceChoice
            active={sourceMode === "profile"}
            title="Use business profile"
            description="Analyze the brand context saved in Dopa."
            icon="profile"
            onClick={() => setSourceMode("profile")}
          />
          <SourceChoice
            active={sourceMode === "url"}
            title="Import URL"
            description="Website, product page, or public LinkedIn profile."
            icon="link"
            onClick={() => setSourceMode("url")}
          />
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {sourceMode === "profile" ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">
                  {business.name}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-secondary">
                  Dopa will use the saved audience, positioning, markets, and
                  current keywords as first-party context.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {availableProfileDetails.length > 0 ? (
                    availableProfileDetails.slice(0, 6).map(({ key, label }) => (
                      <span
                        key={key}
                        className="rounded-md border border-white/8 bg-white/3 px-2 py-1 text-[11px] text-tertiary"
                      >
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="text-[12px] text-amber-200/90">
                      This profile only has a name. Add more context before
                      researching.
                    </span>
                  )}
                </div>
              </div>
              <Link
                href="/dashboard?tab=business"
                className="shrink-0 text-[12px] font-medium text-secondary transition-colors hover:text-white"
              >
                Edit business profile
              </Link>
            </div>
          ) : (
            <div>
              <label
                htmlFor="keyword-source-url"
                className="text-[12px] font-medium text-white"
              >
                Public source URL
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="keyword-source-url"
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://your-site.com or linkedin.com/company/..."
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-[13px] text-white outline-none transition-[border-color,box-shadow] placeholder:text-tertiary focus:border-brand/60 focus:shadow-[0_0_0_3px_rgba(91,95,199,0.12)]"
                />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-tertiary">
                Public pages only. Dopa does not sign in to private profiles or
                bypass access controls.
              </p>
            </div>
          )}

          {products.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-white/6 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[12px] font-medium text-white">
                  Product focus
                </p>
                <p className="mt-0.5 text-[11px] text-tertiary">
                  Optional. Leave blank for brand-level research.
                </p>
              </div>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className="min-w-52 rounded-lg border border-white/10 bg-[#0c0d0e] px-3 py-2 text-[12px] text-secondary outline-none focus:border-brand/60"
              >
                <option value="">Entire brand</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-white/6 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-tertiary">
              {sourceMode === "profile"
                ? `Using ${availableProfileDetails.length} saved profile field${
                    availableProfileDetails.length === 1 ? "" : "s"
                  }${selectedProduct ? ` · ${selectedProduct.product_name}` : ""}`
                : "Qwen will read this page, then compare it with public search language."}
            </p>
            <button
              type="button"
              onClick={() => void startResearch()}
              disabled={
                researching ||
                activeRun ||
                (sourceMode === "url" && !sourceUrl.trim()) ||
                (sourceMode === "profile" &&
                  availableProfileDetails.length === 0)
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {researching || activeRun ? (
                <Spinner className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <NavIcon name="tag" active />
              )}
              {sourceMode === "url"
                ? researching || activeRun
                  ? "Importing…"
                  : "Import and analyze"
                : researching || activeRun
                  ? "Analyzing…"
                  : "Analyze profile"}
            </button>
          </div>
        </div>
      </section>

      {error ? <Message tone="error">{error}</Message> : null}
      {notice ? <Message tone="notice">{notice}</Message> : null}

      {loading ? (
        <div className="dopa-panel flex min-h-28 items-center justify-center">
          <Spinner className="h-5 w-5 animate-spin text-secondary" />
        </div>
      ) : run?.status === "queued" || run?.status === "running" ? (
        <ResearchProgress run={run} />
      ) : run?.status === "failed" ? (
        <Message tone="error">
          {run.error_message ??
            "Keyword research failed. Check the worker configuration and try again."}
        </Message>
      ) : run?.status === "completed" ? (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="dopa-panel overflow-hidden"
        >
          <div className="flex flex-col gap-2 border-b border-white/6 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-[13px] text-secondary">
                <span className="font-medium text-white">
                  {run.recommendations.length}
                </span>{" "}
                evidence-backed recommendation
                {run.recommendations.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-[11px] text-tertiary">
                {run.source_mode === "url" ? "Imported URL" : "Business profile"}
                {run.source_count > 0
                  ? ` · ${run.source_count} public source${
                      run.source_count === 1 ? "" : "s"
                    }`
                  : ""}
                {metricsConnected === false
                  ? " · Connect Google Ads for volume and CPC"
                  : ""}
              </p>
            </div>
            <span className="text-[11px] text-tertiary">
              {run.model_id ?? "Qwen research"}
            </span>
          </div>

          <div className="divide-y divide-white/6">
            {run.recommendations.map((recommendation) => (
              <RecommendationRow
                key={`${run.id}-${recommendation.rank}`}
                recommendation={recommendation}
                metric={metrics[recommendation.keyword.toLocaleLowerCase()]}
                copied={copied === recommendation.suggested_ad_headline}
                onCopy={() =>
                  void copyHeadline(recommendation.suggested_ad_headline)
                }
              />
            ))}
          </div>
        </motion.section>
      ) : null}
    </div>
  );
}

function SourceChoice({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: "profile" | "link";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-start gap-3 px-5 py-4 text-left transition-[background-color,box-shadow] sm:px-6 ${
        active
          ? "bg-white/5 shadow-[inset_0_-2px_0_#5b5fc7]"
          : "bg-transparent hover:bg-white/3"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          active
            ? "border-brand/40 bg-brand/15 text-indigo-100"
            : "border-white/8 bg-white/3 text-tertiary"
        }`}
      >
        <SourceIcon name={icon} />
      </span>
      <span>
        <span className="block text-[13px] font-medium text-white">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-5 text-tertiary">
          {description}
        </span>
      </span>
    </button>
  );
}

function ResearchProgress({ run }: { run: KeywordResearchRunDto }) {
  const stages: KeywordResearchStage[] = [
    "searching",
    "synthesizing",
    "finalizing",
  ];
  const currentIndex =
    run.stage === "queued" ? -1 : stages.indexOf(run.stage);
  return (
    <section className="dopa-panel px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Spinner className="h-4 w-4 animate-spin text-indigo-200" />
        <div>
          <p className="text-[13px] font-medium text-white">
            {stageCopy[run.stage]}
          </p>
          <p className="mt-0.5 text-[11px] text-tertiary">
            You can leave this tab. The report is saved when it finishes.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {stages.map((stage, index) => (
          <div key={stage}>
            <div
              className={`h-1 rounded-full ${
                index <= currentIndex ? "bg-brand" : "bg-white/8"
              }`}
            />
            <p
              className={`mt-1.5 text-[10px] ${
                index <= currentIndex ? "text-secondary" : "text-tertiary"
              }`}
            >
              {stage === "searching"
                ? "Read"
                : stage === "synthesizing"
                  ? "Compare"
                  : "Rank"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendationRow({
  recommendation,
  metric,
  copied,
  onCopy,
}: {
  recommendation: KeywordRecommendation;
  metric?: KeywordMetric;
  copied: boolean;
  onCopy: () => void;
}) {
  const status = statusStyles[recommendation.status];
  return (
    <article className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] ${status.className}`}
          >
            {status.label}
          </span>
          <h3 className="text-[15px] font-medium tracking-[-0.01em] text-white">
            {recommendation.keyword}
          </h3>
          <span className="text-[11px] capitalize text-tertiary">
            {recommendation.category.replace("_", " ")}
          </span>
          <span className="text-[11px] tabular-nums text-tertiary">
            {recommendation.confidence}% confidence
          </span>
        </div>

        {recommendation.current_keyword &&
        recommendation.current_keyword.toLocaleLowerCase() !==
          recommendation.keyword.toLocaleLowerCase() ? (
          <p className="mt-2 text-[12px] text-tertiary">
            Replace{" "}
            <span className="text-secondary">
              “{recommendation.current_keyword}”
            </span>
          </p>
        ) : null}
        <p className="mt-2 text-[13px] leading-6 text-secondary">
          {recommendation.feedback}
        </p>
        <p className="mt-1 text-[12px] leading-5 text-tertiary">
          Intent: {recommendation.intent}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {recommendation.evidence.map((evidence, index) =>
            evidence.source_kind === "web" && evidence.source_url ? (
              <a
                key={`${evidence.source_url}-${index}`}
                href={evidence.source_url}
                target="_blank"
                rel="noreferrer"
                title={evidence.excerpt}
                className="max-w-56 truncate rounded-md border border-white/8 bg-white/3 px-2 py-1 text-[10px] text-tertiary transition-colors hover:border-white/15 hover:text-white"
              >
                {evidence.title}
              </a>
            ) : (
              <span
                key={`${evidence.profile_field}-${index}`}
                title={evidence.excerpt}
                className="rounded-md border border-white/8 bg-white/3 px-2 py-1 text-[10px] text-tertiary"
              >
                {evidence.title}
              </span>
            ),
          )}
        </div>
      </div>

      <aside className="rounded-lg border border-white/8 bg-white/2 p-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-tertiary">
          Ad headline
        </p>
        <p className="mt-1.5 text-[13px] leading-5 text-white">
          {recommendation.suggested_ad_headline}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/6 pt-3">
          <div className="text-[10px] leading-4 text-tertiary">
            <p>
              Volume{" "}
              <span className="tabular-nums text-secondary">
                {metric
                  ? `${metric.avgMonthlySearches.toLocaleString()}/mo`
                  : "—"}
              </span>
            </p>
            <p>
              CPC{" "}
              <span className="tabular-nums text-secondary">
                {metric?.cpcFormatted ?? "—"}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCopy}
            className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-medium text-tertiary transition-colors hover:border-white/20 hover:text-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </aside>
    </article>
  );
}

function Message({
  tone,
  children,
}: {
  tone: "error" | "notice";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-[13px] ${
        tone === "error"
          ? "border-red-400/20 bg-red-400/7 text-red-200"
          : "border-indigo-300/15 bg-indigo-300/6 text-indigo-100"
      }`}
    >
      {children}
    </p>
  );
}

function SourceIcon({ name }: { name: "profile" | "link" }) {
  return name === "profile" ? (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4.5 16c.6-3 2.4-4.5 5.5-4.5s4.9 1.5 5.5 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.7 12.3l4.6-4.6m-6.1 7.6l-1.5 1.5a3.2 3.2 0 01-4.5-4.5l3-3a3.2 3.2 0 014.5 0m6.1-4.6l1.5-1.5a3.2 3.2 0 014.5 4.5l-3 3a3.2 3.2 0 01-4.5 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

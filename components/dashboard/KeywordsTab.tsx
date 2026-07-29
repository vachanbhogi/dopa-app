"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Business } from "@/lib/business-types";
import type { Product } from "@/lib/product-types";
import { listProducts } from "@/app/dashboard/product-actions";
import type { KeywordResult } from "@/app/api/keywords/generate/route";
import { errorMessage, isJsonObject } from "@/lib/validation";
import { NavIcon } from "./DashboardShell";

const easeOut = [0.23, 1, 0.32, 1] as const;

const keywordCategories = new Set([
  "commercial",
  "problem",
  "competitor",
  "long_tail",
]);

type GenerateMode = "initial" | "replace" | "append";

function isKeywordResult(value: unknown): value is KeywordResult {
  if (!isJsonObject(value)) return false;

  return (
    typeof value.keyword === "string" &&
    typeof value.category === "string" &&
    keywordCategories.has(value.category) &&
    typeof value.intentDescription === "string" &&
    typeof value.estimatedSearchVolume === "string" &&
    typeof value.suggestedAdHeadline === "string" &&
    (value.cpcFormatted === undefined ||
      typeof value.cpcFormatted === "string") &&
    (value.trendSignal === undefined || typeof value.trendSignal === "string") &&
    (value.isSurging === undefined || typeof value.isSurging === "boolean") &&
    Array.isArray(value.sources) &&
    value.sources.every((source) => typeof source === "string") &&
    (value.volumeSource === "Google Ads" ||
      value.volumeSource === "AI estimate")
  );
}

function formatCategory(category: KeywordResult["category"]) {
  return category.replace("_", " ");
}

function mergeKeywords(
  existing: KeywordResult[],
  incoming: KeywordResult[],
) {
  const seen = new Set(existing.map((item) => item.keyword.toLowerCase()));
  const novel = incoming.filter(
    (item) => !seen.has(item.keyword.toLowerCase()),
  );
  return [...existing, ...novel];
}

export function KeywordsTab({ business }: { business: Business }) {
  const [scope, setScope] = useState<"brand" | "product">("brand");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [keywords, setKeywords] = useState<KeywordResult[]>([]);
  const [loadingMode, setLoadingMode] = useState<GenerateMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [generatedFor, setGeneratedFor] = useState<{
    scope: "brand" | "product";
    productId?: string;
  } | null>(null);

  useEffect(() => {
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
  }, [business.id]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const loading = loadingMode !== null;
  const scopeLabel =
    scope === "product" && selectedProduct
      ? selectedProduct.product_name
      : business.name;
  const resultsStale =
    keywords.length > 0 &&
    generatedFor !== null &&
    (generatedFor.scope !== scope ||
      (scope === "product" &&
        generatedFor.productId !== selectedProductId));

  async function generateKeywords(mode: GenerateMode = "initial") {
    setLoadingMode(mode);
    setError(null);
    try {
      const res = await fetch("/api/keywords/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          businessName: business.name,
          targetDemographic: business.target_audience ?? "General Audience",
          productName: selectedProduct?.product_name,
          valueProp: selectedProduct?.value_prop,
          price: selectedProduct?.price,
          excludeKeywords:
            mode === "append"
              ? keywords.map((item) => item.keyword)
              : undefined,
        }),
      });

      const data: unknown = await res.json();
      const responseError =
        isJsonObject(data) && typeof data.error === "string"
          ? data.error
          : "Failed to generate keywords";
      if (!res.ok) {
        throw new Error(responseError);
      }

      const incoming =
        isJsonObject(data) && Array.isArray(data.keywords)
          ? data.keywords.filter(isKeywordResult)
          : [];

      if (mode === "append") {
        const merged = mergeKeywords(keywords, incoming);
        if (merged.length === keywords.length) {
          setError(
            "No new unique keywords came back — try Regenerate for a fresh set.",
          );
        } else {
          setKeywords(merged);
        }
      } else {
        setKeywords(incoming);
        setGeneratedFor({
          scope,
          productId: scope === "product" ? selectedProductId : undefined,
        });
      }
    } catch (error: unknown) {
      setError(errorMessage(error, "An unexpected error occurred."));
    } finally {
      setLoadingMode(null);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyword(text);
      window.setTimeout(() => setCopiedKeyword(null), 2000);
    } catch {
      setError("Your browser blocked clipboard access.");
    }
  }

  return (
    <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-6">
      <p className="max-w-2xl text-[14px] leading-6 text-secondary">
        Keyword intelligence for{" "}
        <span className="text-white">{business.name}</span>. Live volume and CPC
        when Google Ads is connected.
      </p>

      <div className="dopa-panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/4">
              <NavIcon name="tag" active />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-medium text-white">Keywords</h2>
              <p className="text-[12px] text-secondary">
                {scope === "product" && selectedProduct
                  ? `Analyzing ${selectedProduct.product_name}`
                  : `Brand-level analysis for ${business.name}`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-[#0c0d0e] p-1">
              <button
                type="button"
                onClick={() => setScope("brand")}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-[background-color,color] duration-150 ${
                  scope === "brand"
                    ? "bg-white/8 text-white"
                    : "text-secondary hover:text-white"
                }`}
              >
                Brand
              </button>
              <button
                type="button"
                onClick={() => setScope("product")}
                disabled={products.length === 0}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-[background-color,color] duration-150 disabled:opacity-40 ${
                  scope === "product"
                    ? "bg-white/8 text-white"
                    : "text-secondary hover:text-white"
                }`}
              >
                Product
              </button>
            </div>

            {keywords.length === 0 ? (
              <button
                type="button"
                onClick={() => void generateKeywords("initial")}
                disabled={loading || (scope === "product" && products.length === 0)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
              >
                {loadingMode === "initial" ? (
                  <>
                    <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  "Analyze keywords"
                )}
              </button>
            ) : null}
          </div>
        </div>

        {scope === "product" && products.length > 0 ? (
          <div className="mt-4 border-t border-white/6 pt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary">
              Product
            </p>
            <div className="flex flex-wrap gap-1.5">
              {products.map((product) => {
                const selected = product.id === selectedProductId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProductId(product.id)}
                    className={`rounded-[5px] border px-2.5 py-1.5 text-[12px] transition-[border-color,background-color,color,transform] duration-150 active:scale-[0.97] ${
                      selected
                        ? "border-white/20 bg-white/8 font-medium text-white"
                        : "border-white/8 bg-white/2 text-secondary hover:border-white/15 hover:bg-white/4 hover:text-white"
                    }`}
                  >
                    {product.product_name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-[13px] text-red-200"
        >
          {error}
        </p>
      ) : null}

      {loadingMode === "initial" || (loadingMode === "replace" && keywords.length === 0) ? (
        <div className="dopa-panel divide-y divide-white/6 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-22 animate-pulse bg-white/2" />
          ))}
        </div>
      ) : keywords.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className="dopa-panel overflow-hidden"
        >
          <div className="flex flex-col gap-3 border-b border-white/6 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="space-y-1">
              <p className="text-[13px] text-secondary">
                <span className="font-medium text-white">{keywords.length}</span>{" "}
                keyword{keywords.length === 1 ? "" : "s"}
                {generatedFor
                  ? ` · ${
                      generatedFor.scope === "product"
                        ? products.find((p) => p.id === generatedFor.productId)
                            ?.product_name ?? scopeLabel
                        : business.name
                    }`
                  : ` · ${scopeLabel}`}
              </p>
              {resultsStale ? (
                <p className="text-[12px] text-amber-200/90">
                  Scope changed — regenerate to refresh this list.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void generateKeywords("replace")}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-medium text-secondary transition-[border-color,color,transform] duration-150 hover:border-white/20 hover:text-white active:scale-[0.98] disabled:opacity-50"
              >
                {loadingMode === "replace" ? (
                  <>
                    <SpinnerIcon className="h-3 w-3 animate-spin" />
                    Regenerating…
                  </>
                ) : (
                  "Regenerate all"
                )}
              </button>

              <button
                type="button"
                onClick={() => void generateKeywords("append")}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-medium text-secondary transition-[border-color,color,transform] duration-150 hover:border-white/20 hover:text-white active:scale-[0.98] disabled:opacity-50"
              >
                {loadingMode === "append" ? (
                  <>
                    <SpinnerIcon className="h-3 w-3 animate-spin" />
                    Adding more…
                  </>
                ) : (
                  "Add more keywords"
                )}
              </button>
            </div>
          </div>

          <div className="hidden border-b border-white/6 px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary lg:grid lg:grid-cols-[minmax(0,1fr)_7rem_5rem_minmax(12rem,16rem)] lg:gap-4">
            <span>Keyword</span>
            <span>Volume</span>
            <span>CPC</span>
            <span>Ad headline</span>
          </div>

          <div className="divide-y divide-white/6">
            {keywords.map((item, index) => (
              <KeywordRow
                key={`${item.keyword}-${index}`}
                item={item}
                copied={copiedKeyword === item.suggestedAdHeadline}
                onCopy={() => void handleCopy(item.suggestedAdHeadline)}
              />
            ))}

            {loadingMode === "append" ? (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`append-skeleton-${index}`}
                    className="h-22 animate-pulse bg-white/2"
                  />
                ))}
              </>
            ) : null}
          </div>
        </motion.div>
      ) : (
        <div className="dopa-panel flex flex-col items-center justify-center border-dashed py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/8 bg-white/4">
            <NavIcon name="tag" />
          </span>
          <h3 className="mt-4 text-[15px] font-medium text-white">
            No keywords yet
          </h3>
          <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-secondary">
            Choose scope above and run analysis. Not happy with the set? Regenerate
            or add more without losing what you keep.
          </p>
        </div>
      )}
    </div>
  );
}

function KeywordRow({
  item,
  copied,
  onCopy,
}: {
  item: KeywordResult;
  copied: boolean;
  onCopy: () => void;
}) {
  const volumeLabel =
    item.volumeSource === "Google Ads" ? "Volume" : "Est. volume";

  return (
    <div className="group grid gap-3 px-5 py-4 transition-[background-color] duration-150 hover:bg-white/2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_7rem_5rem_minmax(12rem,16rem)] lg:items-center lg:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[15px] font-medium tracking-[-0.01em] text-white">
            {item.keyword}
          </span>
          <span className="text-[12px] capitalize text-tertiary">
            {formatCategory(item.category)}
          </span>
          {item.trendSignal ? (
            <>
              <span className="text-tertiary" aria-hidden>
                ·
              </span>
              <span className="text-[12px] text-secondary">
                {item.trendSignal}
              </span>
            </>
          ) : null}
        </div>

        <p className="mt-1.5 text-[13px] leading-6 text-secondary">
          {item.intentDescription}
        </p>

        {item.sources.length > 0 ? (
          <p className="mt-1 text-[12px] text-tertiary lg:hidden">
            {item.sources.join(" · ")}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-x-4 text-[12px] text-tertiary lg:hidden">
          <span>
            {volumeLabel}{" "}
            <span className="tabular-nums text-secondary">
              {item.estimatedSearchVolume}
            </span>
          </span>
          <span>
            CPC{" "}
            <span className="tabular-nums text-secondary">
              {item.cpcFormatted ?? "—"}
            </span>
          </span>
        </div>
      </div>

      <div className="hidden text-[13px] tabular-nums text-secondary lg:block">
        {item.estimatedSearchVolume}
      </div>

      <div className="hidden text-[13px] tabular-nums text-secondary lg:block">
        {item.cpcFormatted ?? "—"}
      </div>

      <div className="flex min-w-0 items-start justify-between gap-3 lg:block">
        <div className="min-w-0 flex-1 lg:flex-none">
          <p className="text-[13px] leading-6 text-secondary">
            {item.suggestedAdHeadline}
          </p>
          {item.sources.length > 0 ? (
            <p className="mt-1 hidden text-[11px] text-tertiary lg:block">
              {item.sources.join(" · ")}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 self-start rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-tertiary transition-[border-color,color,background-color] duration-150 hover:border-white/15 hover:bg-white/4 hover:text-white lg:mt-2"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
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

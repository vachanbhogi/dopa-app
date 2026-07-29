"use client";

import { useEffect, useState } from "react";
import type { Business } from "@/lib/business-types";
import type { Product } from "@/lib/product-types";
import { listProducts } from "@/app/dashboard/product-actions";
import type { KeywordResult } from "@/app/api/keywords/generate/route";
import { errorMessage, isJsonObject } from "@/lib/validation";

const keywordCategories = new Set([
  "commercial",
  "problem",
  "competitor",
  "long_tail",
]);

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

export function KeywordsTab({ business }: { business: Business }) {
  const [scope, setScope] = useState<"brand" | "product">("brand");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [keywords, setKeywords] = useState<KeywordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

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

  async function generateKeywords() {
    setLoading(true);
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
      setKeywords(
        isJsonObject(data) && Array.isArray(data.keywords)
          ? data.keywords.filter(isKeywordResult)
          : [],
      );
    } catch (error: unknown) {
      setError(errorMessage(error, "An unexpected error occurred."));
    } finally {
      setLoading(false);
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
    <div className="space-y-6 animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]">
      {/* ── Scope Header ── */}
      <div className="flex flex-col gap-4 dopa-panel p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-medium text-white">Multi-Source Keyword Intelligence</h2>
            <span className="rounded bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand">
              Multi-Engine
            </span>
          </div>
          <p className="mt-1 text-[13px] text-secondary">
            AI keyword ideas enriched with live Google Ads history and related
            Google Trends topics when those sources are available.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scope Selector Toggle */}
          <div className="flex rounded-lg border border-white/8 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setScope("brand")}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                scope === "brand"
                  ? "bg-white/10 text-white"
                  : "text-secondary hover:text-white"
              }`}
            >
              Brand Level
            </button>
            <button
              type="button"
              onClick={() => setScope("product")}
              disabled={products.length === 0}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${
                scope === "product"
                  ? "bg-white/10 text-white"
                  : "text-secondary hover:text-white"
              }`}
            >
              Product Level
            </button>
          </div>

          {/* Product Dropdown if Scope = Product */}
          {scope === "product" && products.length > 0 && (
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#16171a] px-3 py-1.5 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.product_name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={generateKeywords}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Gathering Signals...</span>
              </>
            ) : (
              <>
                <span>Analyze Keywords</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {/* ── Keywords Grid ── */}
      {keywords.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {keywords.map((item, idx) => (
            <div
              key={idx}
              className="group relative flex flex-col justify-between rounded-xl border border-white/6 bg-[#0c0d0e] p-4 transition-colors hover:border-white/12"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[14px] font-medium text-white">
                    {item.keyword}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                      item.category === "commercial"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : item.category === "problem"
                        ? "bg-amber-500/15 text-amber-400"
                        : item.category === "competitor"
                        ? "bg-purple-500/15 text-purple-400"
                        : "bg-blue-500/15 text-blue-400"
                    }`}
                  >
                    {item.category.replace("_", " ")}
                  </span>
                </div>

                <p className="mt-2 text-[12px] leading-5 text-secondary">
                  {item.intentDescription}
                </p>

                {/* Sources & Trends Tags */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {item.trendSignal && (
                    <span className="rounded-full bg-flame/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-400 border border-orange-500/20">
                      {item.trendSignal}
                    </span>
                  )}
                  {item.sources?.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-white/4 px-1.5 py-0.5 font-mono text-[9px] text-tertiary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-white/6 pt-3">
                <div className="flex items-center justify-between text-[11px] text-tertiary">
                  <span>
                    {item.volumeSource === "Google Ads"
                      ? "Monthly volume"
                      : "AI volume estimate"}
                    :{" "}
                    <strong className="text-white/80">
                      {item.estimatedSearchVolume}
                    </strong>
                  </span>
                  <span>
                    CPC:{" "}
                    <strong className="font-mono text-emerald-400">
                      {item.cpcFormatted ?? "Unavailable"}
                    </strong>
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between rounded-md bg-white/3 px-2 py-1.5">
                  <span className="truncate text-[11px] font-medium text-brand">
                    &quot;{item.suggestedAdHeadline}&quot;
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy(item.suggestedAdHeadline)}
                    className="ml-2 text-[10px] text-secondary hover:text-white"
                  >
                    {copiedKeyword === item.suggestedAdHeadline ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/6 bg-white/1.5 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/4">
            <svg
              className="h-6 w-6 text-white/40"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <path d="M2 8.5V3a1 1 0 011-1h5.5L14 7.5 8.5 13 2 8.5Z" />
              <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
            </svg>
          </div>
          <h3 className="mt-4 text-[15px] font-medium text-white">Multi-Source Keywords Ready</h3>
          <p className="mt-1 max-w-80 text-[13px] text-secondary">
            Select {scope === "brand" ? "Brand Level" : "a Product"} above and
            click &quot;Analyze Keywords&quot;. Live metrics appear only when the
            corresponding source is connected and returns data.
          </p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createBusiness } from "@/app/dashboard/actions";
import { addCompetitor } from "@/app/dashboard/competitor-actions";
import { createProduct } from "@/app/dashboard/product-actions";
import { DopaMark, ArrowRight } from "@/components/landing/icons";
import {
  BRAND_TONES,
  CAMPAIGN_GOALS,
  emptyBusinessInput,
  INDUSTRIES,
  PRICE_RANGES,
  type BusinessInput,
} from "@/lib/business-types";
import { errorMessage, isJsonObject, stringValue } from "@/lib/validation";

type Step = "import" | "review" | "launch";

const STEPS: Step[] = ["import", "review", "launch"];

type FirstProductDraft = {
  product_name: string;
  value_prop: string;
  price: string;
  creative_hook: string;
};

const emptyFirstProduct = (): FirstProductDraft => ({
  product_name: "",
  value_prop: "",
  price: "",
  creative_hook: "",
});

const easeOut = [0.23, 1, 0.32, 1] as const;

export function OnboardingFlow({ firstName }: { firstName: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<Step>("import");
  const [form, setForm] = useState<BusinessInput>(emptyBusinessInput());
  const [firstProduct, setFirstProduct] = useState<FirstProductDraft>(emptyFirstProduct);
  const [competitorsInput, setCompetitorsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [pending, startTransition] = useTransition();

  const stepIndex = STEPS.indexOf(step);

  const setField = <K extends keyof BusinessInput>(key: K, value: BusinessInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  async function handleScan() {
    if (!form.website?.trim()) {
      setError("Enter a website URL");
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/business/auto-discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: form.website }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message =
          isJsonObject(data) && typeof data.error === "string"
            ? data.error
            : "Failed to scan website";
        throw new Error(message);
      }
      if (isJsonObject(data) && isJsonObject(data.profile)) {
        const p = data.profile;
        setForm((prev) => ({
          ...prev,
          website: stringValue(data.websiteUrl, 2_048) ?? prev.website,
          name: stringValue(p.name, 160) ?? prev.name,
          industry: stringValue(p.industry, 120) ?? prev.industry,
          target_audience:
            stringValue(p.target_audience, 1_000) ?? prev.target_audience,
          brand_voice:
            stringValue(p.brand_voice, 120) ?? prev.brand_voice,
          value_proposition:
            stringValue(p.value_proposition, 1_000) ??
            prev.value_proposition,
          price_range:
            stringValue(p.price_range, 120) ?? prev.price_range,
          campaign_goal:
            stringValue(p.campaign_goal, 120) ?? prev.campaign_goal,
        }));

        if (Array.isArray(p.competitors)) {
          setCompetitorsInput(
            p.competitors
              .map((competitor) => stringValue(competitor, 120))
              .filter((competitor): competitor is string =>
                Boolean(competitor),
              )
              .join(", "),
          );
        }

        if (isJsonObject(p.first_product)) {
          const fp = p.first_product;
          setFirstProduct({
            product_name: stringValue(fp.product_name, 160) ?? "",
            value_prop: stringValue(fp.value_prop, 1_000) ?? "",
            price: stringValue(fp.price, 60) ?? "",
            creative_hook: stringValue(fp.creative_hook, 500) ?? "",
          });
        }
        setScanned(true);
      }
      setStep("review");
    } catch (error: unknown) {
      setError(
        errorMessage(
          error,
          "Failed to scan website. You can enter details manually.",
        ),
      );
    } finally {
      setScanning(false);
    }
  }

  function handleFinish() {
    if (!form.name.trim()) {
      setError("Business name is required");
      setStep("review");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await createBusiness(form);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.business) {
        if (competitorsInput.trim()) {
          for (const name of competitorsInput.split(",").map((s) => s.trim()).filter(Boolean)) {
            const competitorResult = await addCompetitor(result.business.id, { name });
            if (competitorResult.error) {
              setError(competitorResult.error);
              return;
            }
          }
        }
        if (firstProduct.product_name.trim()) {
          const productResult = await createProduct(result.business.id, {
            product_name: firstProduct.product_name,
            value_prop: firstProduct.value_prop,
            price: firstProduct.price,
            creative_hooks: firstProduct.creative_hook,
          });
          if (productResult.error) {
            setError(productResult.error);
            return;
          }
        }
      }

      router.push("/dashboard");
    });
  }

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };

  return (
    <div
      className="relative flex min-h-screen flex-col bg-[#08090a] text-white"
      aria-label={`Onboarding for ${firstName}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(88,92,140,0.2),transparent_55%)]"
        aria-hidden
      />
      <div className="dopa-grain pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-16 max-w-300 items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2 text-white">
            <DopaMark className="h-4.5 w-4.5" />
            <span className="text-[15px] font-[510] tracking-[-0.01em]">Dopa</span>
          </Link>
          <span className="font-mono text-[12px] tabular-nums text-tertiary">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-24 md:px-8">
        <div className="w-full max-w-300">
        <AnimatePresence mode="wait">
          {step === "import" && (
            <motion.div key="import" {...slide} transition={{ duration: 0.35, ease: easeOut }}>
              <div className="mx-auto w-full max-w-md -translate-y-6">
                <div className="text-center">
                  <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[48px]">
                    Import your brand
                  </h1>
                  <p className="mx-auto mt-4 max-w-xs text-[15px] leading-6 text-[#8a8f98]">
                    Paste your website URL and we&apos;ll build a draft profile for review.
                  </p>
                </div>

                <div className="mt-9 space-y-3">
                  <input
                    autoFocus
                    value={form.website ?? ""}
                    onChange={(e) => setField("website", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    placeholder="aurabeauty.com"
                    className={inputClassLg}
                  />
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={scanning || !form.website?.trim()}
                    className="flex h-11 w-full items-center justify-center rounded-xl bg-brand text-[14px] font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                  >
                    {scanning ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Scanning…
                      </span>
                    ) : (
                      "Scan brand"
                    )}
                  </button>
                  {error ? <p className="text-center text-[13px] text-red-400">{error}</p> : null}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/6" aria-hidden />
                  <span className="text-[12px] text-tertiary">or</span>
                  <div className="h-px flex-1 bg-white/6" aria-hidden />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("review");
                  }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-1.5 text-[14px] text-secondary transition-colors hover:text-white"
                >
                  Enter details manually
                  <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "review" && (
            <motion.div key="review" {...slide} transition={{ duration: 0.35, ease: easeOut }} className="w-full">
              <div className="mx-auto mb-8 max-w-3xl text-center">
                <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[40px]">
                  Review your brand profile
                </h1>
                <p className="mx-auto mt-3 max-w-lg text-[15px] leading-6 text-[#8a8f98]">
                  {scanned
                    ? "We extracted this from your site. Edit anything before launching."
                    : "Set your brand defaults — Dopa uses these for every campaign."}
                </p>
              </div>

              <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="dopa-panel space-y-5 p-6 sm:p-7">
                  <Field label="Business name" required>
                    <input
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      placeholder="Aura Beauty Co."
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Default audience">
                    <textarea
                      value={form.target_audience}
                      onChange={(e) => setField("target_audience", e.target.value)}
                      rows={2}
                      placeholder="Gen Z & Millennials, eco-conscious shoppers"
                      className={`${inputClass} resize-none`}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Industry">
                      <select
                        value={form.industry}
                        onChange={(e) => setField("industry", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select</option>
                        {INDUSTRIES.map((i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Campaign goal">
                      <select
                        value={form.campaign_goal}
                        onChange={(e) => setField("campaign_goal", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select</option>
                        {CAMPAIGN_GOALS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Price tier">
                    <ChipRow
                      options={PRICE_RANGES}
                      value={form.price_range ?? ""}
                      onChange={(v) => setField("price_range", v)}
                    />
                  </Field>

                  <Field label="Brand tone">
                    <ChipRow
                      options={BRAND_TONES}
                      value={form.brand_voice ?? ""}
                      onChange={(v) => setField("brand_voice", v)}
                    />
                  </Field>

                  <Field label="Competitors" hint="Comma-separated">
                    <input
                      value={competitorsInput}
                      onChange={(e) => setCompetitorsInput(e.target.value)}
                      placeholder="Rival Labs, Brand X"
                      className={inputClass}
                    />
                  </Field>

                  {error ? <p className="text-[12px] text-red-400">{error}</p> : null}

                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                    <button
                      type="button"
                      onClick={() => setStep("import")}
                      className="text-[13px] text-secondary transition-colors hover:text-white"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!form.name.trim()) {
                          setError("Business name is required");
                          return;
                        }
                        setError(null);
                        setStep("launch");
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97]"
                    >
                      Continue
                      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M6 3l5 5-5 5" />
                      </svg>
                    </button>
                  </div>
                </div>

                <BrandPreviewCard form={form} competitors={competitorsInput} website={form.website} />
              </div>
            </motion.div>
          )}

          {step === "launch" && (
            <motion.div key="launch" {...slide} transition={{ duration: 0.35, ease: easeOut }}>
              <div className="mx-auto w-full max-w-2xl -translate-y-6">
                <div className="text-center">
                  <h1 className="text-[36px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[44px]">
                    Add your first product
                  </h1>
                  <p className="mx-auto mt-4 max-w-md text-[16px] leading-7 text-[#8a8f98]">
                    Optional — seed hooks and TRIBE v2 scoring for {form.name || "your brand"}.
                  </p>
                </div>

                <div className="dopa-panel mt-10 space-y-5 p-6 text-left sm:p-8">
                  <Field label="Product name">
                    <input
                      autoFocus
                      value={firstProduct.product_name}
                      onChange={(e) =>
                        setFirstProduct((p) => ({ ...p, product_name: e.target.value }))
                      }
                      placeholder="Aura Glow Skin Serum"
                      className={inputClassLg}
                    />
                  </Field>
                  <Field label="Value proposition">
                    <textarea
                      value={firstProduct.value_prop}
                      onChange={(e) =>
                        setFirstProduct((p) => ({ ...p, value_prop: e.target.value }))
                      }
                      rows={3}
                      placeholder="Visible glow in 7 days without oiliness"
                      className={`${inputClassLg} resize-none`}
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Price">
                      <input
                        value={firstProduct.price}
                        onChange={(e) =>
                          setFirstProduct((p) => ({ ...p, price: e.target.value }))
                        }
                        placeholder="79"
                        className={inputClassLg}
                      />
                    </Field>
                    <Field label="Primary hook">
                      <input
                        value={firstProduct.creative_hook}
                        onChange={(e) =>
                          setFirstProduct((p) => ({ ...p, creative_hook: e.target.value }))
                        }
                        placeholder="7-day glow challenge"
                        className={inputClassLg}
                      />
                    </Field>
                  </div>

                  {error ? <p className="text-[13px] text-red-400">{error}</p> : null}

                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
                    <button
                      type="button"
                      onClick={() => setStep("review")}
                      className="text-[14px] text-secondary transition-colors hover:text-white"
                    >
                      ← Back
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleFinish}
                        disabled={pending}
                        className="text-[14px] text-tertiary transition-colors hover:text-secondary"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={handleFinish}
                        disabled={pending}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-[14px] font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                      >
                        {pending ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Launching…
                          </>
                        ) : (
                          "Launch workspace →"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function BrandPreviewCard({
  form,
  competitors,
  website,
}: {
  form: BusinessInput;
  competitors: string;
  website?: string;
}) {
  const competitorList = competitors
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const filled = [
    form.name,
    form.target_audience,
    form.industry,
    form.brand_voice,
    form.price_range,
    form.campaign_goal,
  ].filter(Boolean).length;

  return (
    <div className="dopa-panel flex flex-col overflow-hidden">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-white">TRIBE v2 Brand Profile</span>
          <span className="rounded-[5px] border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-secondary">
            Live preview
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/20 text-[13px] font-semibold text-brand">
            {form.name?.[0]?.toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-white">
              {form.name || "Business name"}
            </p>
            <p className="truncate text-[11px] text-tertiary">
              {website || "No website"}
            </p>
          </div>
        </div>

        <PreviewRow label="Audience" value={form.target_audience} />
        <PreviewRow label="Industry" value={form.industry} />
        <PreviewRow label="Tone" value={form.brand_voice} />
        <PreviewRow label="Price tier" value={form.price_range} />
        <PreviewRow label="Goal" value={form.campaign_goal} />

        {competitorList.length > 0 ? (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-tertiary">
              Competitors
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {competitorList.map((c) => (
                <span
                  key={c}
                  className="rounded-[5px] border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-secondary"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-auto rounded-lg border border-white/[0.06] bg-[#0c0d0e] p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-tertiary">Profile completeness</span>
            <span className="font-mono text-secondary">{Math.round((filled / 6) * 100)}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
              style={{ width: `${(filled / 6) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-4 text-tertiary">
            Dopa will use this context for cortical encoding, CTR prediction, and ad generation.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-tertiary">{label}</p>
      <p className="mt-0.5 text-[12px] leading-5 text-secondary">
        {value?.trim() || <span className="text-tertiary/60">—</span>}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline gap-1.5">
        <span className="text-[12px] font-medium text-white">
          {label}
          {required ? <span className="text-brand"> *</span> : null}
        </span>
        {hint ? <span className="text-[11px] text-tertiary">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-[5px] border px-2.5 py-1.5 text-[11px] transition-[border-color,background-color,color,transform] duration-150 active:scale-[0.97] ${
              selected
                ? "border-white/20 bg-white/[0.08] font-medium text-white"
                : "border-white/[0.08] bg-transparent text-secondary hover:border-white/15 hover:text-white"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-[#0c0d0e] px-3.5 py-2.5 text-[14px] text-white outline-none transition-[border-color] duration-150 placeholder:text-tertiary hover:border-white/[0.12] focus:border-white/20";

const inputClassLg =
  "w-full rounded-xl border border-white/[0.1] bg-[#0c0d0e] px-4 py-3 text-[15px] text-white outline-none transition-[border-color] duration-150 placeholder:text-tertiary hover:border-white/[0.15] focus:border-white/25";

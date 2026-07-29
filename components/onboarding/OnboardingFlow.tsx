"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createBusiness } from "@/app/dashboard/actions";
import {
  CAMPAIGN_GOALS,
  emptyBusinessInput,
  INDUSTRIES,
  type BusinessInput,
} from "@/lib/business-types";

const STEP_COUNT = 6;

type StepId = "welcome" | "name" | "product" | "industry" | "audience" | "goal";

const STEPS: StepId[] = ["welcome", "name", "product", "industry", "audience", "goal"];

const easeOut = [0.23, 1, 0.32, 1] as const;

export function OnboardingFlow({ firstName }: { firstName: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<BusinessInput>(emptyBusinessInput());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const setField = <K extends keyof BusinessInput>(key: K, value: BusinessInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const goNext = (options?: { skip?: boolean }) => {
    const skipping = options?.skip === true;

    if (!skipping) {
      if (step === "name" && !form.name.trim()) {
        setError("Enter a business name to continue");
        return;
      }
      if (step === "product" && !form.description?.trim()) {
        setError("Tell us what you sell — even a short line helps");
        return;
      }
      if (step === "industry" && !form.industry) {
        setError("Pick an industry");
        return;
      }
      if (step === "audience" && !form.target_audience?.trim()) {
        setError("Describe who your ads should reach");
        return;
      }
    }

    if (isLast) {
      if (!form.name.trim()) {
        setError("Business name is required");
        setDirection(-1);
        setStepIndex(STEPS.indexOf("name"));
        return;
      }

      startTransition(async () => {
        setError(null);
        const result = await createBusiness(form);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push("/dashboard");
      });
      return;
    }

    setDirection(1);
    setStepIndex((i) => i + 1);
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex((i) => i - 1);
    setError(null);
  };

  const slideVariants = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (d: number) => ({ opacity: 0, x: d > 0 ? 48 : -48 }),
        center: { opacity: 1, x: 0 },
        exit: (d: number) => ({ opacity: 0, x: d > 0 ? -48 : 48 }),
      };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#08090a] text-white">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute left-1/2 top-[-20%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-brand/12 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[40vh] w-[50vw] rounded-full bg-accent/8 blur-[100px]" />
      </div>

      {/* Progress */}
      <header className="relative z-10 px-6 pt-6 sm:px-10 sm:pt-8">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={pending}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/4 text-secondary transition-[transform,border-color,color,background-color] duration-150 ease-out hover:border-white/20 hover:text-white active:scale-[0.97] disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>
          ) : (
            <div className="h-9 w-9 shrink-0" />
          )}
          <div className="flex flex-1 gap-1.5">
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/8"
              >
                <motion.div
                  className="h-full rounded-full bg-brand"
                  initial={false}
                  animate={{ scaleX: i <= stepIndex ? 1 : 0 }}
                  style={{ transformOrigin: "left" }}
                  transition={{ duration: reduceMotion ? 0 : 0.35, ease: easeOut }}
                />
              </div>
            ))}
          </div>
          <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-tertiary">
            {stepIndex + 1}/{STEP_COUNT}
          </span>
        </div>
      </header>

      {/* Step content */}
      <main className="relative z-10 flex flex-1 flex-col px-6 pb-36 pt-10 sm:px-10 sm:pt-14">
        <div className="mx-auto w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: easeOut }}
              className="space-y-8"
            >
              {step === "welcome" && (
                <WelcomeStep firstName={firstName} />
              )}
              {step === "name" && (
                <TextStep
                  title="What's your business called?"
                  subtitle="This is how it will appear across your workspace."
                >
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goNext()}
                    placeholder="ActivePulse Pro"
                    className={inputClass}
                  />
                </TextStep>
              )}
              {step === "product" && (
                <TextStep
                  title="What do you sell?"
                  subtitle="A sentence is enough — Dopa uses this to score hooks and messaging."
                >
                  <textarea
                    autoFocus
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={4}
                    placeholder="A smartwatch that tracks recovery and coaches training load for runners."
                    className={`${inputClass} resize-none leading-relaxed`}
                  />
                </TextStep>
              )}
              {step === "industry" && (
                <ChipStep
                  title="What industry are you in?"
                  subtitle="Helps us benchmark against similar advertisers."
                  options={INDUSTRIES}
                  value={form.industry ?? ""}
                  onChange={(v) => setField("industry", v)}
                />
              )}
              {step === "audience" && (
                <TextStep
                  title="Who should your ads speak to?"
                  subtitle="Be specific — age, interests, pain points, buying behavior."
                >
                  <textarea
                    autoFocus
                    value={form.target_audience}
                    onChange={(e) => setField("target_audience", e.target.value)}
                    rows={4}
                    placeholder="Ambitious amateur runners 25–45 who invest in premium gear and follow training plans."
                    className={`${inputClass} resize-none leading-relaxed`}
                  />
                </TextStep>
              )}
              {step === "goal" && (
                <ChipStep
                  title="What's your primary campaign goal?"
                  subtitle="We'll tune predictions and recommendations around this."
                  options={CAMPAIGN_GOALS}
                  value={form.campaign_goal ?? ""}
                  onChange={(v) => setField("campaign_goal", v)}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {error ? (
            <p className="mt-6 text-center text-[13px] text-red-400">{error}</p>
          ) : null}
        </div>
      </main>

      {/* Bottom CTA */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/6 bg-[#08090a]/80 px-6 py-5 backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          <button
            type="button"
            onClick={() => goNext()}
            disabled={pending}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-brand text-[15px] font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_8px_32px_rgba(94,106,210,0.35)] transition-[transform,opacity] duration-150 ease-out hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Setting up…
              </span>
            ) : step === "welcome" ? (
              "Get started"
            ) : isLast ? (
              "Create business"
            ) : (
              "Continue"
            )}
          </button>
          {step !== "welcome" && step !== "name" && !isLast ? (
            <button
              type="button"
              onClick={() => goNext({ skip: true })}
              className="text-center text-[13px] text-tertiary transition-colors duration-150 hover:text-secondary"
            >
              Skip for now
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

function WelcomeStep({ firstName }: { firstName: string }) {
  return (
    <div className="space-y-8 text-center sm:text-left">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/20 sm:mx-0">
        <svg className="h-8 w-8 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 3v18M12 5c-2-2-5-1.5-5 2S10 11 12 11c-2.5 0-5 .5-5 3.5s2.5 4 5 2" />
          <path d="M12 5c2-2 5-1.5 5 2S14 11 12 11c2.5 0 5 .5 5 3.5s-2.5 4-5 2" />
        </svg>
      </div>
      <div className="space-y-3">
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
          Hey {firstName}, let&apos;s set up your business
        </h1>
        <p className="text-[15px] leading-relaxed text-secondary">
          A few quick questions so Dopa can predict ROI, score your creatives with
          TRIBE v2, and tailor recommendations to your brand.
        </p>
      </div>
      <ul className="space-y-3 text-left">
        {[
          "Score ads before you spend",
          "Second-by-second attention timelines",
          "Brain-region insights per creative",
        ].map((item) => (
          <li key={item} className="flex items-center gap-3 text-[14px] text-secondary">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 6l3 3 5-5" />
              </svg>
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TextStep({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.03em] sm:text-[30px]">
          {title}
        </h1>
        <p className="text-[14px] leading-relaxed text-secondary">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ChipStep({
  title,
  subtitle,
  options,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.03em] sm:text-[30px]">
          {title}
        </h1>
        <p className="text-[14px] leading-relaxed text-secondary">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-full border px-4 py-2.5 text-[13px] transition-[transform,border-color,background-color,color] duration-150 ease-out active:scale-[0.97] ${
                selected
                  ? "border-brand/60 bg-brand/20 font-medium text-white"
                  : "border-white/10 bg-white/3 text-secondary hover:border-white/20 hover:text-white"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/4 px-4 py-3.5 text-[15px] text-white outline-none transition-[border-color,background-color] duration-150 placeholder:text-tertiary hover:border-white/15 focus:border-brand/50 focus:bg-white/[0.06]";

import { DopaMark } from "@/components/landing/icons";
import {
  googleAdsOnboardingFor,
  type GoogleAdsSetupStepState,
} from "./google-ads-onboarding-content";
import type { GoogleAdsErrorCode } from "@/utils/google-ads-client";

export function GoogleAdsOnboarding({
  error,
  errorCode,
  oauthResult,
  primaryAction,
}: {
  error: string | null;
  errorCode?: GoogleAdsErrorCode;
  oauthResult?: string;
  primaryAction: React.ReactNode;
}) {
  const onboarding = googleAdsOnboardingFor({
    errorCode,
    oauthResult,
  });

  const openDenver = () => {
    window.dispatchEvent(
      new CustomEvent("dopa:open-denver", {
        detail: { prompt: onboarding.prompt },
      }),
    );
  };

  return (
    <section
      aria-labelledby="google-ads-setup-title"
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0c0e] animate-fade-in"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-brand/[0.08] blur-3xl"
      />

      <div className="relative grid lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <div className="border-b border-white/[0.07] p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
              <DopaMark className="h-4 w-4" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8afff]">
              {onboarding.eyebrow}
            </span>
          </div>

          <div className="mt-5 border-l border-brand/25 pl-4">
            <h3
              id="google-ads-setup-title"
              className="max-w-lg text-[19px] font-medium leading-7 tracking-[-0.02em] text-white"
            >
              {onboarding.title}
            </h3>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-secondary">
              {onboarding.message}
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2.5 text-[12px] leading-5 text-amber-100/80"
            >
              <span className="font-medium text-amber-200">Google said:</span>{" "}
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {primaryAction}
            <button
              type="button"
              onClick={openDenver}
              className="inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/10 px-4 py-2.5 text-[13px] font-medium text-white transition-[border-color,background-color,transform] hover:border-brand/50 hover:bg-brand/15 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Ask Denver to guide me
              <ArrowIcon />
            </button>
          </div>

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-secondary">
            <ShieldIcon />
            Read-only means Dopa cannot launch campaigns, edit budgets, or
            trigger ad spend.
          </p>
        </div>

        <div className="p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-[12px] font-medium text-white">
              What needs to happen
            </p>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-secondary">
              Google Ads access path
            </span>
          </div>

          <ol className="space-y-1">
            {onboarding.steps.map((step, index) => (
              <li
                key={step.label}
                className="grid grid-cols-[28px_minmax(0,1fr)] gap-3"
              >
                <div className="flex flex-col items-center">
                  <StepMarker state={step.state} index={index} />
                  {index < onboarding.steps.length - 1 ? (
                    <span
                      aria-hidden
                      className="my-1 min-h-6 w-px flex-1 bg-white/[0.08]"
                    />
                  ) : null}
                </div>
                <div className="pb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-medium text-white">
                      {step.label}
                    </p>
                    <StepLabel state={step.state} />
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-secondary">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function StepMarker({
  state,
  index,
}: {
  state: GoogleAdsSetupStepState;
  index: number;
}) {
  if (state === "complete") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
        <CheckIcon />
        <span className="sr-only">Complete</span>
      </span>
    );
  }

  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[10px] ${
        state === "current"
          ? "border-brand/50 bg-brand/15 text-white"
          : "border-white/10 bg-white/[0.02] text-tertiary"
      }`}
    >
      {index + 1}
    </span>
  );
}

function StepLabel({ state }: { state: GoogleAdsSetupStepState }) {
  const label =
    state === "complete" ? "Done" : state === "current" ? "Check now" : "Next";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] ${
        state === "complete"
          ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
          : state === "current"
            ? "border-brand/35 bg-brand/[0.1] text-[#a8afff]"
            : "border-white/[0.08] text-secondary"
      }`}
    >
      {label}
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden
      className="h-3 w-3 text-brand"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 6h7M6.5 3l3 3-3 3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/80"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.8 13 4v3.4c0 3.1-2 5.8-5 6.8-3-1-5-3.7-5-6.8V4l5-2.2Z" />
      <path d="m5.8 7.8 1.4 1.4 3-3" />
    </svg>
  );
}

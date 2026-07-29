"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  createBusiness,
  deleteBusiness,
  selectBusiness,
  updateBusiness,
} from "@/app/dashboard/actions";
import { businessDropdown } from "@/lib/dashboard-ui";
import {
  businessToInput,
  BRAND_TONES,
  CAMPAIGN_GOALS,
  emptyBusinessInput,
  INDUSTRIES,
  PRICE_RANGES,
  type Business,
  type BusinessInput,
} from "@/lib/business-types";

const easeOut = [0.23, 1, 0.32, 1] as const;

const slide = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export function BusinessTab({
  businesses,
  selectedBusinessId,
  onSelectBusiness,
}: {
  businesses: Business[];
  selectedBusinessId: string | null;
  onSelectBusiness: (id: string) => void;
}) {
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    setCreatingNew(false);
  }, [selectedBusinessId]);

  const editingId = creatingNew
    ? "new"
    : (selectedBusinessId ?? businesses[0]?.id ?? null);
  const currentBusiness =
    editingId && editingId !== "new"
      ? businesses.find((b) => b.id === editingId)
      : undefined;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={editingId ?? "none"}
          {...slide}
          transition={{ duration: 0.3, ease: easeOut }}
        >
          <BusinessForm
            businesses={businesses}
            editingId={editingId}
            selectedBusinessId={selectedBusinessId}
            currentBusiness={currentBusiness}
            creatingNew={creatingNew}
            onSelectBusiness={onSelectBusiness}
            onStartNew={() => setCreatingNew(true)}
            onCancelNew={() => setCreatingNew(false)}
            onCreated={() => setCreatingNew(false)}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BusinessWorkspaceSelect({
  businesses,
  selectedBusinessId,
  creatingNew,
  currentName,
  onSelect,
  onStartNew,
}: {
  businesses: Business[];
  selectedBusinessId: string | null;
  creatingNew: boolean;
  currentName: string;
  onSelect: (id: string) => void;
  onStartNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = creatingNew ? "+" : (currentName[0]?.toUpperCase() ?? "B");

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch workspace"
        className="flex max-w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-[background-color] duration-150 hover:bg-white/4 active:scale-[0.99]"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${
            creatingNew ? "bg-white/10" : "bg-brand"
          }`}
        >
          {initial}
        </span>
        <span className="min-w-0 truncate text-[15px] font-medium text-white">
          {creatingNew ? "New business" : currentName}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-secondary transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Workspaces"
          className={`${businessDropdown} left-0 right-auto min-w-[min(100%,18rem)] sm:min-w-[20rem]`}
        >
          {businesses.map((business) => {
            const isSelected =
              !creatingNew && business.id === selectedBusinessId;
            return (
              <button
                key={business.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(business.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-[background-color,color] duration-150 ${
                  isSelected
                    ? "bg-white/8 text-white"
                    : "text-secondary hover:bg-white/4 hover:text-white"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/20 text-[10px] font-semibold text-brand">
                  {business.name[0]?.toUpperCase()}
                </span>
                <span className="truncate">{business.name}</span>
              </button>
            );
          })}
          <div className="my-1 border-t border-white/8" />
          <button
            type="button"
            onClick={() => {
              onStartNew();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-secondary transition-[background-color,color] duration-150 hover:bg-white/4 hover:text-white"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-white/20 text-[14px] text-secondary">
              +
            </span>
            <span>New business</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BusinessForm({
  businesses,
  editingId,
  selectedBusinessId,
  currentBusiness,
  creatingNew,
  onSelectBusiness,
  onStartNew,
  onCancelNew,
  onCreated,
}: {
  businesses: Business[];
  editingId: string | "new" | null;
  selectedBusinessId: string | null;
  currentBusiness: Business | undefined;
  creatingNew: boolean;
  onSelectBusiness: (id: string) => void;
  onStartNew: () => void;
  onCancelNew: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<BusinessInput>(() =>
    currentBusiness ? businessToInput(currentBusiness) : emptyBusinessInput(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (editingId === "new") {
      setForm(emptyBusinessInput());
    } else if (currentBusiness) {
      setForm(businessToInput(currentBusiness));
    }
    setMessage(null);
    setError(null);
  }, [editingId, currentBusiness?.id]);

  const setField = <K extends keyof BusinessInput>(key: K, value: BusinessInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
    setError(null);
  };

  const handleSave = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      if (editingId === "new") {
        const result = await createBusiness(form);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.business) {
          await selectBusiness(result.business.id);
        }
        setMessage("Business created");
        onCreated();
        router.refresh();
        return;
      }

      if (!editingId) return;
      const result = await updateBusiness(editingId, form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Saved");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!editingId || editingId === "new") return;
    if (!window.confirm("Delete this business? This cannot be undone.")) return;

    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await deleteBusiness(editingId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if ("redirectTo" in result && result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      setMessage("Business deleted");
      router.refresh();
    });
  };

  const displayName = creatingNew ? "New business" : (currentBusiness?.name ?? "Business");

  return (
    <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-6">
      <p className="text-[14px] leading-6 text-secondary">
        {creatingNew
          ? "Create a new workspace for another brand."
          : "Brand defaults and campaign context for this workspace."}
      </p>

      <div className="dopa-panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-white/6 px-5 py-3.5 sm:px-6">
          <BusinessWorkspaceSelect
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            creatingNew={creatingNew}
            currentName={displayName}
            onSelect={onSelectBusiness}
            onStartNew={onStartNew}
          />
          <div className="flex shrink-0 items-center gap-2">
            {creatingNew ? (
              <button
                type="button"
                onClick={onCancelNew}
                className="rounded-lg px-2.5 py-1.5 text-[12px] text-secondary transition-colors hover:text-white"
              >
                Cancel
              </button>
            ) : editingId && editingId !== "new" ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-lg border border-red-400/20 px-2.5 py-1.5 text-[12px] text-red-400 transition-[border-color,opacity] duration-150 hover:border-red-400/40 disabled:opacity-50"
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-8 p-5 sm:p-6">
          <Section title="Identity" description="Core brand details used across Dopa.">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Business name" required>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Acme Co."
                  className={inputClass}
                />
              </Field>
              <Field label="Website">
                <input
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="acme.com"
                  className={inputClass}
                />
              </Field>
              <Field label="Markets / geos" className="lg:col-span-2">
                <input
                  value={form.markets}
                  onChange={(e) => setField("markets", e.target.value)}
                  placeholder="US, CA, UK"
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Brand defaults"
            description="Baseline audience and voice for every campaign."
            divided
          >
            <div className="space-y-4">
              <Field label="Default audience" hint="Baseline demographic">
                <textarea
                  value={form.target_audience}
                  onChange={(e) => setField("target_audience", e.target.value)}
                  rows={2}
                  placeholder="Gen Z & Millennials, tech-savvy, eco-conscious"
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <Field label="Industry">
                <ChipRow
                  options={INDUSTRIES}
                  value={form.industry ?? ""}
                  onChange={(v) => setField("industry", v)}
                />
              </Field>

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

              <Field label="Core keywords" hint="Comma-separated">
                <input
                  value={form.target_keywords}
                  onChange={(e) => setField("target_keywords", e.target.value)}
                  placeholder="running watch, recovery tracker"
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Campaign context"
            description="Goals and positioning for creative scoring."
            divided
          >
            <div className="space-y-4">
              <Field label="Primary goal">
                <ChipRow
                  options={CAMPAIGN_GOALS}
                  value={form.campaign_goal ?? ""}
                  onChange={(v) => setField("campaign_goal", v)}
                />
              </Field>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="What do you sell?">
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={3}
                    placeholder="Smartwatch that tracks recovery for runners."
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <Field label="Value proposition">
                  <textarea
                    value={form.value_proposition}
                    onChange={(e) => setField("value_proposition", e.target.value)}
                    rows={3}
                    placeholder="Clinically accurate recovery without a coach subscription."
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </div>

              <Field label="Competitors" hint="Comma-separated">
                <input
                  value={form.competitors}
                  onChange={(e) => setField("competitors", e.target.value)}
                  placeholder="Whoop, Garmin, Oura"
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/6 px-5 py-4 sm:px-6">
          <div className="min-h-5 text-[12px]">
            {error ? <span className="text-red-400">{error}</span> : null}
            {message ? <span className="text-emerald-400">{message}</span> : null}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !form.name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          >
            {pending ? "Saving…" : editingId === "new" ? "Create business" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  divided = false,
  children,
}: {
  title: string;
  description?: string;
  divided?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`space-y-4 ${divided ? "border-t border-white/6 pt-8" : ""}`}
    >
      <div>
        <h4 className="text-[13px] font-medium text-white">{title}</h4>
        {description ? (
          <p className="mt-1 text-[12px] leading-5 text-secondary">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
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
                ? "border-white/20 bg-white/8 font-medium text-white"
                : "border-white/8 bg-transparent text-secondary hover:border-white/15 hover:text-white"
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
  "w-full rounded-xl border border-white/8 bg-[#0c0d0e] px-3.5 py-2.5 text-[14px] text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-tertiary hover:border-white/12 focus:border-brand/50 focus:ring-1 focus:ring-brand/30";

function Field({
  label,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
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

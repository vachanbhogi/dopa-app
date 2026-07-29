"use client";

import { useState, useTransition } from "react";
import {
  createBusiness,
  deleteBusiness,
  updateBusiness,
} from "@/app/dashboard/actions";
import {
  businessToInput,
  CAMPAIGN_GOALS,
  emptyBusinessInput,
  INDUSTRIES,
  type Business,
  type BusinessInput,
} from "@/lib/business-types";

export function SettingsTab({
  businesses,
  selectedBusinessId,
}: {
  businesses: Business[];
  selectedBusinessId: string | null;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(
    selectedBusinessId ?? businesses[0]?.id ?? null,
  );
  const currentBusiness =
    editingId && editingId !== "new"
      ? businesses.find((b) => b.id === editingId)
      : undefined;

  return (
    <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-8">
      <div>
        <p className="text-[14px] leading-6 text-secondary">
          Manage your businesses and campaign profile. Dopa uses this context to
          score creatives and tailor recommendations for each brand.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Business list */}
        <div className="space-y-2">
          <div className="px-1 text-[11px] font-medium uppercase tracking-wider text-tertiary">
            Businesses
          </div>
          <div className="space-y-0.5 rounded-xl border border-white/6 bg-white/2 p-1.5">
            {businesses.map((business) => {
              const active = editingId === business.id;
              return (
                <button
                  key={business.id}
                  type="button"
                  onClick={() => setEditingId(business.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-[background-color,color] duration-150 ${
                    active
                      ? "bg-white/8 font-medium text-white"
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
            <button
              type="button"
              onClick={() => setEditingId("new")}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-[background-color,color] duration-150 ${
                editingId === "new"
                  ? "bg-white/8 font-medium text-white"
                  : "text-secondary hover:bg-white/4 hover:text-white"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-white/15 text-[12px] text-secondary">
                +
              </span>
              New business
            </button>
          </div>
        </div>

        {/* Form */}
        <BusinessForm
          key={editingId ?? "none"}
          editingId={editingId}
          currentBusiness={currentBusiness}
          businesses={businesses}
          onEditingIdChange={setEditingId}
        />
      </div>
    </div>
  );
}

function BusinessForm({
  editingId,
  currentBusiness,
  businesses,
  onEditingIdChange,
}: {
  editingId: string | "new" | null;
  currentBusiness: Business | undefined;
  businesses: Business[];
  onEditingIdChange: (id: string | "new" | null) => void;
}) {
  const [form, setForm] = useState<BusinessInput>(() =>
    currentBusiness ? businessToInput(currentBusiness) : emptyBusinessInput(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        setMessage("Business created");
        if (result.business) onEditingIdChange(result.business.id);
        return;
      }

      if (!editingId) return;
      const result = await updateBusiness(editingId, form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Saved");
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
      setMessage("Business deleted");
      const next = businesses.find((b) => b.id !== editingId);
      onEditingIdChange(next?.id ?? "new");
    });
  };

  return (
    <div className="space-y-6 rounded-xl border border-white/6 bg-white/2 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-medium text-white">
            {editingId === "new" ? "New business" : "Business profile"}
          </h2>
          <p className="mt-1 text-[13px] text-secondary">
            Details that help ad scoring, hooks, and messaging recommendations.
          </p>
        </div>
        {editingId && editingId !== "new" && businesses.length > 1 ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="shrink-0 rounded-md border border-red-400/20 px-2.5 py-1.5 text-[12px] text-red-400 transition-[border-color,opacity] duration-150 hover:border-red-400/40 disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" required className="sm:col-span-2">
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
            placeholder="https://acme.com"
            className={inputClass}
          />
        </Field>

        <Field label="Industry">
          <select
            value={form.industry}
            onChange={(e) => setField("industry", e.target.value)}
            className={inputClass}
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Primary campaign goal">
          <select
            value={form.campaign_goal}
            onChange={(e) => setField("campaign_goal", e.target.value)}
            className={inputClass}
          >
            <option value="">Select goal</option>
            {CAMPAIGN_GOALS.map((goal) => (
              <option key={goal} value={goal}>
                {goal}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Markets / geos">
          <input
            value={form.markets}
            onChange={(e) => setField("markets", e.target.value)}
            placeholder="US, CA, UK"
            className={inputClass}
          />
        </Field>

        <Field
          label="What do you sell?"
          hint="Product or service in 1–2 sentences"
          className="sm:col-span-2"
        >
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={3}
            placeholder="Smartwatch that tracks recovery and coaches training load for runners."
            className={`${inputClass} resize-y`}
          />
        </Field>

        <Field
          label="Target audience"
          hint="Who should the ads speak to?"
          className="sm:col-span-2"
        >
          <textarea
            value={form.target_audience}
            onChange={(e) => setField("target_audience", e.target.value)}
            rows={2}
            placeholder="Ambitious amateur runners 25–45 who buy premium training gear."
            className={`${inputClass} resize-y`}
          />
        </Field>

        <Field
          label="Value proposition"
          hint="Why choose you over alternatives?"
          className="sm:col-span-2"
        >
          <textarea
            value={form.value_proposition}
            onChange={(e) => setField("value_proposition", e.target.value)}
            rows={2}
            placeholder="Clinically accurate recovery scores without a coach subscription."
            className={`${inputClass} resize-y`}
          />
        </Field>

        <Field label="Brand voice" hint="Tone for creatives">
          <input
            value={form.brand_voice}
            onChange={(e) => setField("brand_voice", e.target.value)}
            placeholder="Confident, technical, encouraging"
            className={inputClass}
          />
        </Field>

        <Field label="Competitors" hint="Names or brands to watch">
          <input
            value={form.competitors}
            onChange={(e) => setField("competitors", e.target.value)}
            placeholder="Whoop, Garmin, Oura"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/6 pt-4">
        <div className="min-h-5 text-[12px]">
          {error ? <span className="text-red-400">{error}</span> : null}
          {message ? <span className="text-emerald-400">{message}</span> : null}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !form.name.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
        >
          {pending ? "Saving…" : editingId === "new" ? "Create business" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none transition-[border-color,background-color] duration-150 placeholder:text-tertiary hover:border-white/15 focus:border-brand/50 focus:bg-white/[0.04]";

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

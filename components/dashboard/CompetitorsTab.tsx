"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { Business } from "@/lib/business-types";
import {
  addCompetitor,
  deleteCompetitor,
  listCompetitors,
  type CompetitorItem,
} from "@/app/dashboard/competitor-actions";
import type { DiscoveredCompetitor } from "@/app/api/competitors/discover/route";
import type { CompetitorMove } from "@/app/api/competitors/moves/route";
import { errorMessage, isJsonObject } from "@/lib/validation";
import { NavIcon } from "./DashboardShell";

const moveTypes = new Set([
  "ad_launched",
  "price_change",
  "positioning_pivot",
  "hook_change",
]);
const riskLevels = new Set(["low", "medium", "high"]);

function isDiscoveredCompetitor(
  value: unknown,
): value is DiscoveredCompetitor {
  if (!isJsonObject(value)) return false;

  return (
    typeof value.name === "string" &&
    typeof value.website_url === "string" &&
    typeof value.primary_angle === "string" &&
    typeof value.overlap === "string" &&
    typeof value.predicted_ctr === "number" &&
    Number.isFinite(value.predicted_ctr)
  );
}

function isCompetitorMove(value: unknown): value is CompetitorMove {
  if (!isJsonObject(value)) return false;

  return (
    typeof value.move_type === "string" &&
    moveTypes.has(value.move_type) &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.risk_level === "string" &&
    riskLevels.has(value.risk_level) &&
    typeof value.predicted_ctr === "number" &&
    Number.isFinite(value.predicted_ctr) &&
    typeof value.timeAgo === "string"
  );
}

function riskBadgeClass(level: CompetitorMove["risk_level"]) {
  switch (level) {
    case "high":
      return "border-red-400/25 bg-red-400/8 text-red-300";
    case "medium":
      return "border-amber-400/25 bg-amber-400/8 text-amber-200";
    default:
      return "border-white/12 bg-white/4 text-secondary";
  }
}

export function CompetitorsTab({ business }: { business: Business }) {
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [discovering, setDiscovering] = useState(false);
  const [discoveredList, setDiscoveredList] = useState<DiscoveredCompetitor[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");
  const [manualAngle, setManualAngle] = useState("");
  const [pending, startTransition] = useTransition();

  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorItem | null>(null);
  const [moves, setMoves] = useState<CompetitorMove[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(false);
  const [movesError, setMovesError] = useState<string | null>(null);

  const loadCompetitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listCompetitors(business.id);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const list = res.competitors ?? [];
    setCompetitors(list);
    setSelectedCompetitor((current) => {
      if (!current) return list[0] ?? null;
      return list.find((competitor) => competitor.id === current.id) ?? list[0] ?? null;
    });
  }, [business.id]);

  useEffect(() => {
    queueMicrotask(() => void loadCompetitors());
  }, [loadCompetitors]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadMoves() {
      if (!selectedCompetitor) return;
      setLoadingMoves(true);
      setMoves([]);
      setMovesError(null);
      try {
        const res = await fetch("/api/competitors/moves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            competitorName: selectedCompetitor.name,
            primaryAngle: selectedCompetitor.primary_angle,
          }),
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          const message =
            isJsonObject(data) && typeof data.error === "string"
              ? data.error
              : "Could not generate competitor scenarios.";
          throw new Error(message);
        }
        setMoves(
          isJsonObject(data) && Array.isArray(data.moves)
            ? data.moves.filter(isCompetitorMove)
            : [],
        );
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setMoves([]);
        setMovesError(
          errorMessage(error, "Could not generate competitor scenarios."),
        );
      } finally {
        if (!controller.signal.aborted) setLoadingMoves(false);
      }
    }
    void loadMoves();
    return () => controller.abort();
  }, [selectedCompetitor]);

  async function handleAutoDiscover() {
    setDiscovering(true);
    setError(null);
    try {
      const res = await fetch("/api/competitors/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: business.name,
          industry: business.industry,
          targetAudience: business.target_audience,
          website: business.website,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message =
          isJsonObject(data) && typeof data.error === "string"
            ? data.error
            : "Failed to discover competitors";
        throw new Error(message);
      }
      setDiscoveredList(
        isJsonObject(data) && Array.isArray(data.competitors)
          ? data.competitors.filter(isDiscoveredCompetitor)
          : [],
      );
    } catch (error: unknown) {
      setError(errorMessage(error, "Auto-discovery failed."));
    } finally {
      setDiscovering(false);
    }
  }

  async function handleAddDiscovered(c: DiscoveredCompetitor) {
    const res = await addCompetitor(business.id, {
      name: c.name,
      website_url: c.website_url,
      primary_angle: c.primary_angle,
      predicted_ctr: c.predicted_ctr,
    });
    if (!res.error) {
      setDiscoveredList((prev) => prev.filter((item) => item.name !== c.name));
      await loadCompetitors();
    } else {
      setError(res.error);
    }
  }

  function handleSaveManual() {
    if (!manualName.trim()) return;
    startTransition(async () => {
      const res = await addCompetitor(business.id, {
        name: manualName,
        website_url: manualWebsite,
        primary_angle: manualAngle,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setModalOpen(false);
      setManualName("");
      setManualWebsite("");
      setManualAngle("");
      await loadCompetitors();
    });
  }

  return (
    <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-6">
      <p className="text-[14px] leading-6 text-secondary">
        Build a shortlist of likely rivals and explore planning scenarios for{" "}
        <span className="text-white">{business.name}</span>. Verify AI suggestions
        before using them in campaign decisions.
      </p>

      <div className="dopa-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/4">
            <NavIcon name="eye" active />
          </span>
          <div>
            <h2 className="text-[15px] font-medium text-white">Competitor research</h2>
            <p className="text-[12px] text-secondary">AI-assisted discovery and scenario planning</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAutoDiscover}
            disabled={discovering}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          >
            {discovering ? (
              <>
                <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                Scanning market…
              </>
            ) : (
              <>
                <SparkleIcon className="h-3.5 w-3.5" />
                Auto-discover rivals
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-[13px] font-medium text-secondary transition-[border-color,color,transform] duration-150 hover:border-white/20 hover:text-white active:scale-[0.97]"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add competitor
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-[13px] text-red-200"
        >
          {error}
        </p>
      ) : null}

      {discoveredList.length > 0 ? (
        <div className="dopa-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-medium text-white">Suggested rivals</h3>
              <p className="mt-1 text-[12px] leading-5 text-secondary">
                AI found these possible competitors. Review each before tracking.
              </p>
            </div>
            <span className="rounded-[5px] border border-white/10 px-2 py-0.5 text-[10px] text-tertiary">
              {discoveredList.length} suggestions
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discoveredList.map((c) => (
              <div
                key={c.name}
                className="flex flex-col justify-between rounded-xl border border-white/8 bg-[#0c0d0e] p-4 transition-[border-color] duration-150 hover:border-white/12"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-white">{c.name}</span>
                    <span className="shrink-0 rounded-[5px] border border-white/10 px-1.5 py-0.5 text-[10px] text-tertiary">
                      {c.overlap}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-secondary">
                    {c.primary_angle}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/6 pt-3">
                  <span className="font-mono text-[11px] text-tertiary">
                    CTR est. {c.predicted_ctr}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddDiscovered(c)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition-[border-color,background-color] duration-150 hover:border-white/20 hover:bg-white/4"
                  >
                    Track
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl border border-white/8 bg-[#0c0d0e]" />
      ) : competitors.length === 0 ? (
        <div className="dopa-panel flex flex-col items-center justify-center border-dashed py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/8 bg-white/4">
            <NavIcon name="eye" />
          </span>
          <h3 className="mt-4 text-[15px] font-medium text-white">No competitors tracked</h3>
          <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-secondary">
            Auto-discover rivals or add competitors manually to build a research
            shortlist and explore planning scenarios.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-3">
            <h3 className="text-[13px] font-medium text-white">Tracked competitors</h3>
            {competitors.map((comp) => {
              const isSelected = selectedCompetitor?.id === comp.id;
              return (
                <div
                  key={comp.id}
                  className={`rounded-xl border p-4 transition-[border-color,background-color] duration-150 ${
                    isSelected
                      ? "border-white/16 bg-brand/12"
                      : "border-white/8 bg-[#0c0d0e] hover:border-white/12"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCompetitor(comp)}
                    aria-pressed={isSelected}
                    className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-[14px] font-medium text-white">{comp.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-tertiary">
                        {comp.predicted_ctr == null
                          ? "No score"
                          : `${comp.predicted_ctr}% CTR`}
                      </span>
                    </span>

                    {comp.primary_angle ? (
                      <span className="mt-2 block line-clamp-2 text-[12px] leading-5 text-secondary">
                        {comp.primary_angle}
                      </span>
                    ) : null}
                  </button>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/6 pt-2.5 text-[11px]">
                    <span className="truncate text-tertiary">
                      {comp.website_url || "No website"}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Delete ${comp.name}?`)) return;
                        const result = await deleteCompetitor(comp.id);
                        if (result.error) {
                          setError(result.error);
                          return;
                        }
                        await loadCompetitors();
                      }}
                      className="shrink-0 text-red-400 transition-colors hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dopa-panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 border-b border-white/6 pb-4">
              <div>
                <h3 className="text-[15px] font-medium text-white">
                  {selectedCompetitor
                    ? `${selectedCompetitor.name} scenarios`
                    : "Select a competitor"}
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-secondary">
                  AI-generated possibilities to investigate — not detected events.
                </p>
              </div>
              <span className="shrink-0 rounded-[5px] border border-white/10 px-2 py-0.5 text-[10px] text-tertiary">
                Planning
              </span>
            </div>

            {loadingMoves ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl border border-white/8 bg-[#0c0d0e]"
                  />
                ))}
              </div>
            ) : moves.length > 0 ? (
              <div className="mt-4 space-y-3">
                {moves.map((move, idx) => (
                  <div
                    key={`${move.move_type}-${move.title}-${idx}`}
                    className="rounded-xl border border-white/8 bg-[#0c0d0e] p-4 transition-[border-color] duration-150 hover:border-white/12"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-[5px] border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${riskBadgeClass(move.risk_level)}`}
                        >
                          {move.risk_level}
                        </span>
                        <span className="text-[13px] font-medium text-white">{move.title}</span>
                      </div>
                      <span className="text-[10px] text-tertiary">{move.timeAgo}</span>
                    </div>

                    <p className="mt-2 text-[12px] leading-5 text-secondary">
                      {move.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/6 pt-2.5 text-[11px]">
                      <span className="text-tertiary">
                        {move.move_type.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-tertiary">
                        CTR est. {move.predicted_ctr}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : movesError ? (
              <p className="py-12 text-center text-[13px] text-red-300">{movesError}</p>
            ) : (
              <p className="py-12 text-center text-[13px] text-secondary">
                No planning scenarios are available for this competitor yet.
              </p>
            )}
          </div>
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-white/8 bg-[#0f1011] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-competitor-title"
          >
            <div className="border-b border-white/6 px-5 py-4 sm:px-6">
              <h3
                id="add-competitor-title"
                className="text-[17px] font-medium tracking-[-0.02em] text-white"
              >
                Add competitor
              </h3>
              <p className="mt-1 text-[13px] text-secondary">
                Track a rival&apos;s ad strategy and positioning.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <Field label="Competitor name" required>
                <input
                  autoFocus
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Rival Labs"
                  className={inputClass}
                />
              </Field>

              <Field label="Website URL">
                <input
                  value={manualWebsite}
                  onChange={(e) => setManualWebsite(e.target.value)}
                  placeholder="rivallabs.com"
                  className={inputClass}
                />
              </Field>

              <Field label="Primary ad strategy / hook">
                <textarea
                  value={manualAngle}
                  onChange={(e) => setManualAngle(e.target.value)}
                  rows={2}
                  placeholder="Price-slash video montage & 3-second problem hook"
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/6 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-4 py-2 text-[13px] text-secondary transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManual}
                disabled={pending || !manualName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
              >
                {pending ? "Saving…" : "Start tracking"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-white">
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
      <path d="M4.5 4.5l1 1M10.5 10.5l1 1M10.5 4.5l-1 1M4.5 10.5l-1 1" />
      <circle cx="8" cy="8" r="2" />
    </svg>
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

const inputClass =
  "w-full rounded-xl border border-white/8 bg-[#0c0d0e] px-3.5 py-2.5 text-[14px] text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-tertiary hover:border-white/12 focus:border-brand/50 focus:ring-1 focus:ring-brand/30";

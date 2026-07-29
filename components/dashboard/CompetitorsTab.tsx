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

export function CompetitorsTab({ business }: { business: Business }) {
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-Discovery State
  const [discovering, setDiscovering] = useState(false);
  const [discoveredList, setDiscoveredList] = useState<DiscoveredCompetitor[]>([]);
  
  // Manual Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");
  const [manualAngle, setManualAngle] = useState("");
  const [pending, startTransition] = useTransition();

  // Moves Timeline State for Selected Competitor
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorItem | null>(null);
  const [moves, setMoves] = useState<CompetitorMove[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(false);

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
    if (list.length > 0 && !selectedCompetitor) {
      setSelectedCompetitor(list[0]);
    }
  }, [business.id, selectedCompetitor]);

  useEffect(() => {
    loadCompetitors();
  }, [loadCompetitors]);

  // Load Moves when selected competitor changes
  useEffect(() => {
    if (!selectedCompetitor) return;
    async function loadMoves() {
      setLoadingMoves(true);
      try {
        const res = await fetch("/api/competitors/moves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitorName: selectedCompetitor?.name,
            primaryAngle: selectedCompetitor?.primary_angle,
          }),
        });
        const data = await res.json();
        setMoves(data.moves || []);
      } catch {
        setMoves([]);
      } finally {
        setLoadingMoves(false);
      }
    }
    loadMoves();
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to discover competitors");
      setDiscoveredList(data.competitors || []);
    } catch (err: any) {
      setError(err.message || "Auto-discovery failed.");
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
    }
  }

  function handleSaveManual() {
    if (!manualName.trim()) return;
    startTransition(async () => {
      const res = await addCompetitor(business.id, {
        name: manualName,
        website_url: manualWebsite,
        primary_angle: manualAngle,
        predicted_ctr: 1.35,
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
    <div className="space-y-8 animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]">
      {/* ── Header Controls ── */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/8 bg-[#0f1011] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-medium text-white">Competitor Radar & Move Detector</h2>
            <span className="rounded bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand">
              Live Tracker
            </span>
          </div>
          <p className="mt-1 text-[13px] text-secondary">
            Auto-discover rivals, track campaign moves, and compare predicted CTR pre-spend with TRIBE v2.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAutoDiscover}
            disabled={discovering}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {discovering ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Scanning Market...</span>
              </>
            ) : (
              <>
                <span>✨ Auto-Discover Rivals</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-[13px] font-medium text-secondary transition-colors hover:border-white/20 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add Competitor
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {/* ── Discovered Competitors Suggestion Banner ── */}
      {discoveredList.length > 0 && (
        <div className="rounded-xl border border-brand/30 bg-brand/10 p-5">
          <h3 className="text-[14px] font-medium text-white">Discovered Industry Competitors</h3>
          <p className="mt-1 text-[12px] text-secondary">
            Groq AI identified these direct rivals for {business.name}. Click to add them to your live radar.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discoveredList.map((c) => (
              <div
                key={c.name}
                className="flex flex-col justify-between rounded-lg border border-white/8 bg-[#111215] p-3.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{c.name}</span>
                    <span className="rounded bg-white/6 px-1.5 py-0.5 text-[10px] text-tertiary">
                      {c.overlap}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-secondary line-clamp-2">{c.primary_angle}</p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/6 pt-2.5">
                  <span className="font-mono text-[11px] text-emerald-400">
                    Est. CTR: {c.predicted_ctr}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddDiscovered(c)}
                    className="rounded bg-brand px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90"
                  >
                    Track Rival +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tracked Competitors List & Live Radar ── */}
      {loading ? (
        <div className="h-40 animate-pulse rounded-xl border border-white/6 bg-white/2" />
      ) : competitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/1.5 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/4">
            <svg className="h-6 w-6 text-white/30" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2 8s2.5-4.5 6-4.5S14 8 14 8s-2.5 4.5-6 4.5S2 8 2 8Z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
          </div>
          <h3 className="mt-4 text-[15px] font-medium text-white">No Competitors Tracked Yet</h3>
          <p className="mt-1.5 max-w-sm text-center text-[13px] leading-5 text-secondary">
            Click &quot;Auto-Discover Rivals&quot; or manually add competitors to track their ads and strategy moves.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Competitor List */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-medium text-white">Tracked Competitors</h3>
            {competitors.map((comp) => {
              const isSelected = selectedCompetitor?.id === comp.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompetitor(comp)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-brand bg-brand/10 shadow-[0_0_20px_rgba(94,106,210,0.15)]"
                      : "border-white/6 bg-[#0c0d0e] hover:border-white/12"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">{comp.name}</h4>
                    <span className="font-mono text-[12px] font-semibold text-emerald-400">
                      Predicted CTR {comp.predicted_ctr || 1.25}%
                    </span>
                  </div>

                  {comp.primary_angle && (
                    <p className="mt-1.5 text-[12px] leading-4 text-secondary line-clamp-2">
                      {comp.primary_angle}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-white/6 pt-2 text-[11px] text-tertiary">
                    <span>{comp.website_url || "No website"}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${comp.name}?`)) {
                          deleteCompetitor(comp.id).then(loadCompetitors);
                        }
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Moves Timeline for Selected Competitor */}
          <div className="rounded-xl border border-white/8 bg-[#0f1011] p-5">
            <div className="flex items-center justify-between border-b border-white/6 pb-3">
              <div>
                <h3 className="text-[15px] font-medium text-white">
                  {selectedCompetitor ? `${selectedCompetitor.name} Move Radar` : "Select a Competitor"}
                </h3>
                <p className="text-[12px] text-secondary">
                  Real-time detected ad launches, positioning pivots & offer changes.
                </p>
              </div>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                Live Feed
              </span>
            </div>

            {loadingMoves ? (
              <div className="space-y-3 pt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-white/3" />
                ))}
              </div>
            ) : moves.length > 0 ? (
              <div className="mt-4 space-y-3">
                {moves.map((move, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/6 bg-[#090a0b] p-3.5 transition-colors hover:border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            move.risk_level === "high"
                              ? "bg-red-500/20 text-red-400"
                              : move.risk_level === "medium"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {move.risk_level} Risk
                        </span>
                        <span className="text-[12px] font-medium text-white">{move.title}</span>
                      </div>
                      <span className="text-[10px] text-tertiary">{move.timeAgo}</span>
                    </div>

                    <p className="mt-1.5 text-[12px] leading-5 text-secondary">{move.description}</p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-white/6 pt-2 text-[11px]">
                      <span className="text-tertiary">Type: {move.move_type.replace("_", " ")}</span>
                      <span className="font-mono text-emerald-400">
                        Ad CTR: {move.predicted_ctr}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-[13px] text-secondary">
                No recent moves recorded for this competitor yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Manual Add Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#111114] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-medium text-white">Add Competitor</h3>
            <p className="mt-1 text-[13px] text-secondary">
              Track a specific rival&apos;s ad strategy and moves.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-white">Competitor Name *</span>
                <input
                  autoFocus
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Rival Labs"
                  className={inputClass}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-white">Website URL</span>
                <input
                  value={manualWebsite}
                  onChange={(e) => setManualWebsite(e.target.value)}
                  placeholder="https://rivallabs.com"
                  className={inputClass}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-white">Primary Ad Strategy / Hook</span>
                <textarea
                  value={manualAngle}
                  onChange={(e) => setManualAngle(e.target.value)}
                  rows={2}
                  placeholder="Price-slash video montage & 3-second problem hook"
                  className={`${inputClass} resize-none`}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-[13px] text-secondary hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManual}
                disabled={pending || !manualName.trim()}
                className="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving..." : "Start Tracking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none placeholder:text-tertiary focus:border-brand/50";

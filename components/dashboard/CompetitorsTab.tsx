"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  addCompetitor,
  deleteCompetitor,
  listCompetitors,
  type CompetitorItem,
} from "@/app/dashboard/competitor-actions";
import type { Business } from "@/lib/business-types";
import type {
  CompetitorRelationship,
  MonitorSettingsDto,
  ResearchCandidateDto,
  ResearchRunDto,
} from "@/lib/competitor-intelligence/types";
import { errorMessage, isJsonObject } from "@/lib/validation";
import {
  DopaModal,
  dopaInputClass,
  dopaPrimaryButtonClass,
  dopaTextareaClass,
} from "@/components/ui/DopaModal";
import { NavIcon } from "./DashboardShell";

type CompetitorSignal = {
  id: string;
  move_type: string;
  title: string;
  description: string | null;
  risk_level: "low" | "medium" | "high";
  source_url: string | null;
  source_title: string | null;
  signal_date: string | null;
  observed_at: string;
  confidence: number | null;
};

const relationships: Array<{
  id: CompetitorRelationship;
  label: string;
  description: string;
}> = [
  {
    id: "direct",
    label: "Direct",
    description: "Same buyer, problem, and comparable product.",
  },
  {
    id: "indirect",
    label: "Indirect",
    description: "Competes for the same outcome or budget differently.",
  },
  {
    id: "emerging",
    label: "Emerging",
    description: "Credible adjacent threats over the next 6–12 months.",
  },
];

const stageCopy: Record<ResearchRunDto["stage"], string> = {
  queued: "Waiting for the research worker",
  searching: "Searching the public web",
  synthesizing: "Checking sources and comparing rivals",
  finalizing: "Ranking evidence-backed competitors",
  completed: "Research complete",
  failed: "Research needs attention",
};

const defaultSettings = (businessId: string): MonitorSettingsDto => ({
  business_id: businessId,
  enabled: false,
  cadence: "daily",
  local_time: "08:00:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  min_alert_score: 70,
  notify_in_app: true,
  notify_browser: false,
  next_run_at: null,
});

export function CompetitorsTab({ business }: { business: Business }) {
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [run, setRun] = useState<ResearchRunDto | null>(null);
  const [settings, setSettings] = useState<MonitorSettingsDto>(
    defaultSettings(business.id),
  );
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [relationship, setRelationship] =
    useState<CompetitorRelationship>("direct");
  const [modalOpen, setModalOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");
  const [manualAngle, setManualAngle] = useState("");
  const [selectedCompetitor, setSelectedCompetitor] =
    useState<CompetitorItem | null>(null);
  const [signals, setSignals] = useState<CompetitorSignal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [pending, startTransition] = useTransition();

  const loadCompetitors = useCallback(async () => {
    const response = await listCompetitors(business.id);
    if (response.error) throw new Error(response.error);
    const list = response.competitors ?? [];
    setCompetitors(list);
    setSelectedCompetitor((current) =>
      current
        ? (list.find((item) => item.id === current.id) ?? list[0] ?? null)
        : (list[0] ?? null),
    );
  }, [business.id]);

  const loadResearch = useCallback(async () => {
    const response = await fetch(
      `/api/competitors/research?businessId=${encodeURIComponent(business.id)}`,
      { cache: "no-store" },
    );
    const data: unknown = await response.json();
    if (!response.ok || !isJsonObject(data)) {
      throw new Error(
        isJsonObject(data) && typeof data.error === "string"
          ? data.error
          : "Could not load competitor research.",
      );
    }
    setRun((data.run as ResearchRunDto | null) ?? null);
    setSettings(
      (data.settings as MonitorSettingsDto | undefined) ??
        defaultSettings(business.id),
    );
  }, [business.id]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadCompetitors(), loadResearch()]);
    } catch (loadError) {
      setError(errorMessage(loadError, "Could not load competitor intelligence."));
    } finally {
      setLoading(false);
    }
  }, [loadCompetitors, loadResearch]);

  useEffect(() => {
    queueMicrotask(() => void loadAll());
  }, [loadAll]);

  useEffect(() => {
    if (run?.status !== "queued" && run?.status !== "running") return;
    const timer = window.setInterval(() => {
      void loadResearch().catch(() => undefined);
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [loadResearch, run?.status]);

  useEffect(() => {
    if (!selectedCompetitor) {
      queueMicrotask(() => setSignals([]));
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => setLoadingSignals(true));
    fetch(
      `/api/competitors/moves?competitorId=${encodeURIComponent(selectedCompetitor.id)}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok || !isJsonObject(data)) {
          throw new Error("Could not load sourced signals.");
        }
        setSignals(
          Array.isArray(data.signals)
            ? (data.signals as CompetitorSignal[])
            : [],
        );
      })
      .catch((signalError) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(signalError, "Could not load sourced signals."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSignals(false);
      });
    return () => controller.abort();
  }, [selectedCompetitor]);

  const candidates = useMemo(
    () =>
      (run?.candidates ?? []).filter(
        (candidate) => candidate.relationship === relationship,
      ),
    [relationship, run?.candidates],
  );

  async function startResearch() {
    setResearching(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/competitors/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      const data: unknown = await response.json();
      if (!response.ok && response.status !== 409) {
        throw new Error(
          isJsonObject(data) && typeof data.error === "string"
            ? data.error
            : "Could not start competitor research.",
        );
      }
      setNotice(
        response.status === 409
          ? "Research is already running for this business."
          : "Research queued. You can leave this tab while Dopa works.",
      );
      await loadResearch();
    } catch (researchError) {
      setError(errorMessage(researchError, "Could not start competitor research."));
    } finally {
      setResearching(false);
    }
  }

  async function trackCandidate(candidate: ResearchCandidateDto) {
    setError(null);
    const response = await addCompetitor(business.id, {
      name: candidate.name,
      candidateId: candidate.id,
    });
    if (response.error) {
      setError(response.error);
      return;
    }
    await loadCompetitors();
    setNotice(`${candidate.name} is now tracked.`);
  }

  function saveManual() {
    if (!manualName.trim()) return;
    startTransition(async () => {
      const response = await addCompetitor(business.id, {
        name: manualName,
        website_url: manualWebsite,
        primary_angle: manualAngle,
      });
      if (response.error) {
        setError(response.error);
        return;
      }
      setModalOpen(false);
      setManualName("");
      setManualWebsite("");
      setManualAngle("");
      await loadCompetitors();
    });
  }

  async function saveMonitoring() {
    setSavingSettings(true);
    setError(null);
    try {
      if (settings.notify_browser) {
        await subscribeToBrowserPush();
      }
      const response = await fetch("/api/competitors/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          enabled: settings.enabled,
          localTime: settings.local_time.slice(0, 5),
          timezone: settings.timezone,
          minAlertScore: settings.min_alert_score,
          notifyInApp: settings.notify_in_app,
          notifyBrowser: settings.notify_browser,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok || !isJsonObject(data)) {
        throw new Error(
          isJsonObject(data) && typeof data.error === "string"
            ? data.error
            : "Could not save monitoring settings.",
        );
      }
      setSettings(data.settings as MonitorSettingsDto);
      setNotice("Monitoring preferences saved.");
    } catch (settingsError) {
      setError(errorMessage(settingsError, "Could not save monitoring settings."));
    } finally {
      setSavingSettings(false);
    }
  }

  if (loading) {
    return (
      <div className="dopa-panel flex min-h-56 items-center justify-center">
        <Spinner className="h-5 w-5 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-[15px] font-medium text-white">
            Competitor Research
          </h2>
          <p className="mt-1 text-[14px] leading-6 text-secondary">
            Live, source-backed market research for{" "}
            <span className="text-white">{business.name}</span>. Dopa separates
            who competes today from who could become a threat next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startResearch}
            disabled={
              researching || run?.status === "queued" || run?.status === "running"
            }
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {researching || run?.status === "queued" || run?.status === "running" ? (
              <Spinner className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkle className="h-3.5 w-3.5" />
            )}
            Research market
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg border border-white/10 px-4 py-2 text-[13px] font-medium text-secondary transition-colors hover:border-white/20 hover:text-white"
          >
            Add manually
          </button>
        </div>
      </div>

      {error ? <Message tone="error">{error}</Message> : null}
      {notice ? <Message tone="notice">{notice}</Message> : null}

      <ResearchStatus run={run} />

      {run?.status === "completed" ? (
        <section className="space-y-4">
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/8 bg-white/[0.02] p-1">
            {relationships.map((item) => {
              const count =
                run.candidates.filter(
                  (candidate) => candidate.relationship === item.id,
                ).length;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRelationship(item.id)}
                  className={`min-w-34 flex-1 rounded-md px-3 py-2 text-left transition-colors ${
                    relationship === item.id
                      ? "bg-white/8 text-white"
                      : "text-secondary hover:bg-white/4 hover:text-white"
                  }`}
                >
                  <span className="block text-[12px] font-medium">
                    {item.label} · {count}
                  </span>
                  <span className="mt-0.5 hidden text-[10px] leading-4 text-tertiary md:block">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>

          {candidates.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  tracked={competitors.some(
                    (item) =>
                      item.candidate_id === candidate.id ||
                      (item.normalized_domain &&
                        item.normalized_domain === candidate.normalized_domain),
                  )}
                  onTrack={() => trackCandidate(candidate)}
                />
              ))}
            </div>
          ) : (
            <EmptyState>
              Dopa did not find enough evidence for a {relationship} competitor.
              It will not pad the list with guesses.
            </EmptyState>
          )}
        </section>
      ) : !run ? (
        <EmptyState>
          Start a market research run to find direct, indirect, and emerging
          competitors with evidence you can inspect.
        </EmptyState>
      ) : null}

      <TrackedCompetitors
        competitors={competitors}
        selected={selectedCompetitor}
        onSelect={setSelectedCompetitor}
        onDelete={async (id) => {
          const response = await deleteCompetitor(id);
          if (response.error) setError(response.error);
          else await loadCompetitors();
        }}
        signals={signals}
        loadingSignals={loadingSignals}
      />

      <MonitoringPanel
        settings={settings}
        onChange={setSettings}
        onSave={saveMonitoring}
        saving={savingSettings}
      />

      {modalOpen ? (
        <DopaModal
          title="Track a competitor"
          subtitle="Add a known rival now. Future research will look for sourced signals about it."
          onClose={() => setModalOpen(false)}
        >
          <div className="space-y-4">
            <label className="block space-y-1.5 text-[12px] text-secondary">
              Name
              <input
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                className={dopaInputClass}
                placeholder="Competitor name"
                autoFocus
              />
            </label>
            <label className="block space-y-1.5 text-[12px] text-secondary">
              Website
              <input
                value={manualWebsite}
                onChange={(event) => setManualWebsite(event.target.value)}
                className={dopaInputClass}
                placeholder="https://competitor.com"
                type="url"
              />
            </label>
            <label className="block space-y-1.5 text-[12px] text-secondary">
              Why they matter
              <textarea
                value={manualAngle}
                onChange={(event) => setManualAngle(event.target.value)}
                className={dopaTextareaClass}
                placeholder="What makes this company relevant?"
              />
            </label>
            <button
              type="button"
              onClick={saveManual}
              disabled={pending || !manualName.trim()}
              className={dopaPrimaryButtonClass}
            >
              {pending ? "Saving…" : "Track competitor"}
            </button>
          </div>
        </DopaModal>
      ) : null}
    </div>
  );
}

function ResearchStatus({ run }: { run: ResearchRunDto | null }) {
  if (!run) return null;
  const active = run.status === "queued" || run.status === "running";
  return (
    <div className="dopa-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/4">
          {active ? (
            <Spinner className="h-4 w-4 animate-spin text-brand" />
          ) : (
            <NavIcon name="eye" active />
          )}
        </span>
        <div>
          <h2 className="text-[14px] font-medium text-white">
            {stageCopy[run.stage]}
          </h2>
          <p className="mt-0.5 text-[11px] text-tertiary">
            {run.completed_at
              ? `${formatDate(run.completed_at)} · ${run.source_count} sources`
              : `Started ${formatDate(run.queued_at)}`}
          </p>
        </div>
      </div>
      {active ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6 sm:w-48">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{
              width:
                run.stage === "searching"
                  ? "32%"
                  : run.stage === "synthesizing"
                    ? "66%"
                    : run.stage === "finalizing"
                      ? "88%"
                      : "12%",
            }}
          />
        </div>
      ) : null}
      {run.status === "failed" ? (
        <p className="max-w-md text-[12px] text-red-200">
          {run.error_message ?? "Research failed. Start another run to retry."}
        </p>
      ) : null}
    </div>
  );
}

function CandidateCard({
  candidate,
  tracked,
  onTrack,
}: {
  candidate: ResearchCandidateDto;
  tracked: boolean;
  onTrack: () => void;
}) {
  return (
    <article className="dopa-panel flex flex-col p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[15px] font-medium text-white">
              {candidate.name}
            </h3>
            <span className="rounded-[5px] border border-white/10 px-2 py-0.5 text-[10px] capitalize text-secondary">
              {candidate.relationship}
            </span>
          </div>
          <a
            href={candidate.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-[11px] text-brand hover:underline"
          >
            {candidate.normalized_domain}
          </a>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[22px] font-medium text-white">
            {candidate.threat_score}
          </p>
          <p className="text-[9px] uppercase tracking-[0.12em] text-tertiary">
            threat
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-white/6 bg-black/15 p-3">
        <Metric label="Confidence" value={`${candidate.confidence}%`} />
        <Metric label="Horizon" value={horizonLabel(candidate.threat_horizon)} />
      </div>

      <div className="mt-4 space-y-3 text-[12px] leading-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-tertiary">
            Why they compete
          </p>
          <p className="mt-1 text-secondary">{candidate.why_competitor}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-tertiary">
            Why now
          </p>
          <p className="mt-1 text-secondary">{candidate.why_now}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-white/6 pt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-tertiary">
          Evidence
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {candidate.evidence.map((evidence) => (
            <a
              key={evidence.id}
              href={evidence.source_url}
              target="_blank"
              rel="noopener noreferrer"
              title={evidence.claim}
              className="max-w-full truncate rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[10px] text-secondary transition-colors hover:border-white/15 hover:text-white"
            >
              {evidence.title}
            </a>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onTrack}
        disabled={tracked}
        className="mt-5 rounded-lg border border-white/10 px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-white/5 disabled:cursor-default disabled:text-tertiary"
      >
        {tracked ? "Tracked" : "Track competitor"}
      </button>
    </article>
  );
}

function TrackedCompetitors({
  competitors,
  selected,
  onSelect,
  onDelete,
  signals,
  loadingSignals,
}: {
  competitors: CompetitorItem[];
  selected: CompetitorItem | null;
  onSelect: (competitor: CompetitorItem) => void;
  onDelete: (id: string) => Promise<void>;
  signals: CompetitorSignal[];
  loadingSignals: boolean;
}) {
  return (
    <section className="dopa-panel overflow-hidden">
      <div className="border-b border-white/6 px-5 py-4">
        <h2 className="text-[14px] font-medium text-white">Tracked competitors</h2>
        <p className="mt-1 text-[11px] text-secondary">
          Sourced signals appear here after each research run.
        </p>
      </div>
      {competitors.length === 0 ? (
        <div className="p-6 text-[12px] text-secondary">
          No competitors are tracked yet. Review a researched candidate or add
          one manually.
        </div>
      ) : (
        <div className="grid min-h-64 md:grid-cols-[15rem_1fr]">
          <div className="border-b border-white/6 p-2 md:border-r md:border-b-0">
            {competitors.map((competitor) => (
              <button
                key={competitor.id}
                type="button"
                onClick={() => onSelect(competitor)}
                className={`mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left ${
                  selected?.id === competitor.id
                    ? "bg-white/8 text-white"
                    : "text-secondary hover:bg-white/4 hover:text-white"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium">
                    {competitor.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-tertiary">
                    {competitor.normalized_domain ?? "Manual competitor"}
                  </span>
                </span>
                {competitor.threat_score !== null ? (
                  <span className="font-mono text-[11px] text-tertiary">
                    {competitor.threat_score}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="p-5">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[14px] font-medium text-white">
                      {selected.name}
                    </h3>
                    <p className="mt-1 max-w-2xl text-[11px] leading-5 text-secondary">
                      {selected.primary_angle || "No positioning note yet."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onDelete(selected.id)}
                    className="text-[10px] text-tertiary hover:text-red-300"
                  >
                    Stop tracking
                  </button>
                </div>
                <div className="mt-5">
                  {loadingSignals ? (
                    <Spinner className="h-4 w-4 animate-spin text-secondary" />
                  ) : signals.length > 0 ? (
                    <div className="space-y-3">
                      {signals.map((signal) => (
                        <div
                          key={signal.id}
                          className="rounded-lg border border-white/7 bg-black/15 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[12px] font-medium text-white">
                                {signal.title}
                              </p>
                              <p className="mt-1 text-[11px] leading-5 text-secondary">
                                {signal.description}
                              </p>
                            </div>
                            <span className="rounded-[5px] border border-white/10 px-1.5 py-0.5 text-[9px] uppercase text-tertiary">
                              {signal.risk_level}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-tertiary">
                            <span>{formatDate(signal.signal_date ?? signal.observed_at)}</span>
                            {signal.confidence !== null ? (
                              <span>{signal.confidence}% confidence</span>
                            ) : null}
                            {signal.source_url ? (
                              <a
                                href={signal.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand hover:underline"
                              >
                                {signal.source_title ?? "Source"}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] leading-5 text-tertiary">
                      No verified signals yet. Dopa will only show activity that
                      maps to a public source.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function MonitoringPanel({
  settings,
  onChange,
  onSave,
  saving,
}: {
  settings: MonitorSettingsDto;
  onChange: (settings: MonitorSettingsDto) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}) {
  return (
    <section className="dopa-panel p-5">
      <div>
        <h2 className="text-[14px] font-medium text-white">Daily monitoring</h2>
        <p className="mt-1 text-[11px] leading-5 text-secondary">
          You choose when Dopa scans and how it should notify you.
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Toggle
          label="Daily research"
          checked={settings.enabled}
          onChange={(enabled) => onChange({ ...settings, enabled })}
        />
        <label className="space-y-1.5 text-[11px] text-secondary">
          Local time
          <input
            type="time"
            value={settings.local_time.slice(0, 5)}
            onChange={(event) =>
              onChange({ ...settings, local_time: event.target.value })
            }
            className={dopaInputClass}
          />
        </label>
        <label className="space-y-1.5 text-[11px] text-secondary">
          Alert at threat score
          <input
            type="number"
            min={0}
            max={100}
            value={settings.min_alert_score}
            onChange={(event) =>
              onChange({
                ...settings,
                min_alert_score: Number(event.target.value),
              })
            }
            className={dopaInputClass}
          />
        </label>
        <div className="space-y-2">
          <Toggle
            label="In-app alerts"
            checked={settings.notify_in_app}
            onChange={(notify_in_app) =>
              onChange({ ...settings, notify_in_app })
            }
          />
          <Toggle
            label="Browser push"
            checked={settings.notify_browser}
            onChange={(notify_browser) =>
              onChange({ ...settings, notify_browser })
            }
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-4">
        <p className="text-[10px] text-tertiary">
          Timezone: {settings.timezone}
          {settings.next_run_at
            ? ` · Next run ${formatDate(settings.next_run_at)}`
            : ""}
        </p>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-lg bg-white px-3.5 py-2 text-[12px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save monitoring"}
        </button>
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[11px] text-secondary">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#5e6ad2]"
      />
    </label>
  );
}

async function subscribeToBrowserPush() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    typeof Notification === "undefined"
  ) {
    throw new Error("Browser notifications are not supported on this device.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      "Notification permission was not granted. On iPhone, install Dopa to the Home Screen first.",
    );
  }
  const keyResponse = await fetch("/api/push/subscriptions");
  const keyData: unknown = await keyResponse.json();
  if (!keyResponse.ok || !isJsonObject(keyData) || typeof keyData.publicKey !== "string") {
    throw new Error(
      isJsonObject(keyData) && typeof keyData.error === "string"
        ? keyData.error
        : "Browser notifications are not configured.",
    );
  }
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64Key(keyData.publicKey),
    }));
  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) throw new Error("Could not save browser notification access.");
}

function base64Key(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob(
    (value + padding).replace(/-/g, "+").replace(/_/g, "/"),
  );
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
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
      className={`rounded-lg border px-4 py-3 text-[12px] ${
        tone === "error"
          ? "border-red-400/20 bg-red-400/[0.07] text-red-200"
          : "border-brand/20 bg-brand/[0.07] text-[#c9cdf7]"
      }`}
    >
      {children}
    </p>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="dopa-panel flex min-h-36 items-center justify-center px-6 text-center text-[12px] leading-6 text-secondary">
      <p className="max-w-xl">{children}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.1em] text-tertiary">
        {label}
      </p>
      <p className="mt-1 text-[11px] text-white">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Unknown date";
}

function horizonLabel(value: ResearchCandidateDto["threat_horizon"]) {
  if (value === "now") return "Now";
  if (value === "next_6_months") return "Next 6 months";
  return "Next 12 months";
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity=".25" />
      <path
        d="M14 8a6 6 0 00-6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden
    >
      <path d="M8 1.5l1.2 3.3L12.5 6 9.2 7.2 8 10.5 6.8 7.2 3.5 6l3.3-1.2L8 1.5Z" />
      <path d="M12.5 10l.6 1.6 1.4.6-1.4.6-.6 1.7-.6-1.7-1.4-.6 1.4-.6.6-1.6Z" />
    </svg>
  );
}

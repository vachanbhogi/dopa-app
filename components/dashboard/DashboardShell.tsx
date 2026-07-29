"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

type Tab =
  | "creatives"
  | "campaigns"
  | "competitors"
  | "scores"
  | "metrics"
  | "settings";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "creatives", label: "Creatives", icon: "film" },
  { id: "campaigns", label: "Campaigns", icon: "megaphone" },
  { id: "competitors", label: "Competitors", icon: "eye" },
  { id: "scores", label: "TRIBE Scores", icon: "brain" },
  { id: "metrics", label: "Metrics", icon: "chart" },
  { id: "settings", label: "Settings", icon: "gear" },
];

export function DashboardShell({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const [active, setActive] = useState<Tab>("creatives");

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#09090b]">
        {/* Brand */}
        <div className="flex h-13 items-center gap-2.5 border-b border-white/[0.06] px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
            {initials[0]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium leading-tight text-white">
              {displayName}
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 space-y-0.5 px-2 pt-3" aria-label="Dashboard">
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`
                  group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px]
                  transition-[background-color,color] duration-150
                  active:scale-[0.98] active:transition-transform active:duration-100 active:ease-out
                  ${
                    isActive
                      ? "bg-white/[0.08] font-medium text-white"
                      : "text-[#8a8f98] hover:bg-white/[0.04] hover:text-[#c4c9d4]"
                  }
                `}
              >
                <NavIcon name={tab.icon} active={isActive} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom user */}
        <div className="border-t border-white/[0.06] px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/25 text-[10px] font-medium text-brand">
              {initials}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-secondary">
              {email}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-13 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
          <h1 className="text-[15px] font-medium text-white">
            {tabs.find((t) => t.id === active)?.label}
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md px-2.5 py-1.5 text-[12px] text-secondary transition-colors duration-150 hover:text-white"
            >
              Home
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-secondary transition-[border-color,color] duration-150 hover:border-white/20 hover:text-white active:scale-[0.97] active:transition-transform active:duration-100 active:ease-out"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <TabContent tab={active} />
        </main>
      </div>
    </div>
  );
}

/* ── Tab content panels ── */

function TabContent({ tab }: { tab: Tab }) {
  return (
    <div key={tab} className="mx-auto max-w-[960px] px-6 py-8">
      {tab === "creatives" && <CreativesPanel />}
      {tab === "campaigns" && <CampaignsPanel />}
      {tab === "competitors" && <CompetitorsPanel />}
      {tab === "scores" && <ScoresPanel />}
      {tab === "metrics" && <MetricsPanel />}
      {tab === "settings" && <SettingsPanel />}
    </div>
  );
}

function StaggerItem({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  return (
    <div
      className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Creatives ── */

function CreativesPanel() {
  return (
    <>
      <StaggerItem index={0}>
        <p className="text-[14px] leading-6 text-secondary">
          Upload ad videos and images. Dopa scores each creative through Meta
          TRIBE v2 neural encoding, then predicts performance before you spend.
        </p>
      </StaggerItem>

      <StaggerItem index={1}>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total creatives", value: "0" },
            { label: "Scored", value: "0" },
            { label: "Avg ROI", value: "—" },
            { label: "Top tier", value: "—" },
          ].map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </StaggerItem>

      <StaggerItem index={2}>
        <EmptyState
          title="No creatives yet"
          body="Upload ad videos or images to score them with TRIBE v2 brain encoding and see predicted ROI, CVR, and click timelines."
          action="Upload creative"
        />
      </StaggerItem>
    </>
  );
}

/* ── Campaigns ── */

function CampaignsPanel() {
  return (
    <>
      <StaggerItem index={0}>
        <p className="text-[14px] leading-6 text-secondary">
          Group creatives into campaigns. Dopa agents auto-pause losers, boost
          Tier 4–5 performers, and draft next briefs.
        </p>
      </StaggerItem>

      <StaggerItem index={1}>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Active campaigns", value: "0" },
            { label: "Agent actions", value: "0" },
            { label: "Budget saved", value: "—" },
          ].map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </StaggerItem>

      <StaggerItem index={2}>
        <EmptyState
          title="No campaigns running"
          body="Create a campaign to group your creatives and let Dopa's agents manage performance automatically."
          action="New campaign"
        />
      </StaggerItem>
    </>
  );
}

/* ── Competitors ── */

function CompetitorsPanel() {
  return (
    <>
      <StaggerItem index={0}>
        <p className="text-[14px] leading-6 text-secondary">
          Scrape competitor ads from the open web and score them on the same
          brain → metric stack. Know their strengths before they run.
        </p>
      </StaggerItem>

      <StaggerItem index={1}>
        <EmptyState
          title="No competitors tracked"
          body="Add competitor brands to automatically pull their creatives and score them alongside yours."
          action="Add competitor"
        />
      </StaggerItem>
    </>
  );
}

/* ── Scores ── */

function ScoresPanel() {
  return (
    <>
      <StaggerItem index={0}>
        <p className="text-[14px] leading-6 text-secondary">
          Detailed TRIBE v2 neural scores — inspect which Destrieux brain ROIs
          (vision, audition, language) drive each prediction.
        </p>
      </StaggerItem>

      <StaggerItem index={1}>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Predictions run", value: "0" },
            { label: "Avg CVR", value: "—" },
            { label: "mean iCTR", value: "—" },
            { label: "Peak attention", value: "—" },
          ].map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </StaggerItem>

      <StaggerItem index={2}>
        <EmptyState
          title="No scores yet"
          body="Score a creative to see second-by-second click timelines and cortical driver breakdowns."
          action="Score a creative"
        />
      </StaggerItem>
    </>
  );
}

/* ── Metrics ── */

function MetricsPanel() {
  return (
    <>
      <StaggerItem index={0}>
        <p className="text-[14px] leading-6 text-secondary">
          High-level performance overview across all campaigns — ROI trends,
          tier distributions, and budget efficiency.
        </p>
      </StaggerItem>

      <StaggerItem index={1}>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total spend", value: "$0" },
            { label: "Predicted ROI", value: "—" },
            { label: "Creatives tested", value: "0" },
            { label: "A/B tests replaced", value: "0" },
          ].map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </StaggerItem>

      <StaggerItem index={2}>
        <div className="mt-8 flex h-[200px] items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01]">
          <p className="text-[13px] text-tertiary">
            Charts will appear once creatives are scored
          </p>
        </div>
      </StaggerItem>
    </>
  );
}

/* ── Settings ── */

function SettingsPanel() {
  return (
    <>
      <StaggerItem index={0}>
        <p className="text-[14px] leading-6 text-secondary">
          Manage your workspace, team members, and API integrations.
        </p>
      </StaggerItem>

      <StaggerItem index={1}>
        <div className="mt-6 space-y-3">
          {[
            {
              label: "Workspace name",
              hint: "Your team's Dopa workspace",
              value: "My workspace",
            },
            {
              label: "Notification emails",
              hint: "Get alerts when agents take action",
              value: "Enabled",
            },
            {
              label: "API access",
              hint: "Programmatic access to TRIBE scoring",
              value: "No keys created",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-colors duration-150 hover:border-white/[0.1] hover:bg-white/[0.03]"
            >
              <div>
                <div className="text-[13px] font-medium text-white">
                  {s.label}
                </div>
                <div className="mt-0.5 text-[12px] text-secondary">
                  {s.hint}
                </div>
              </div>
              <span className="text-[12px] text-tertiary">{s.value}</span>
            </div>
          ))}
        </div>
      </StaggerItem>
    </>
  );
}

/* ── Shared components ── */

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-[border-color,background-color] duration-150 hover:border-white/[0.1] hover:bg-white/[0.035]">
      <div className="text-[11px] font-medium uppercase tracking-wider text-tertiary">
        {label}
      </div>
      <div className="mt-1.5 text-[24px] font-semibold tracking-[-0.03em] text-white">
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: string;
}) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.015] py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
        <svg
          className="h-6 w-6 text-white/30"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        >
          <path d="M8 3v10M3 8h10" />
        </svg>
      </div>
      <p className="mt-4 text-[15px] font-medium text-white">{title}</p>
      <p className="mt-1.5 max-w-[300px] text-center text-[13px] leading-5 text-secondary">
        {body}
      </p>
      <button className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 text-[13px] font-medium text-white transition-[background-color,border-color,transform] duration-150 ease-out hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.97]">
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M8 3v10M3 8h10" />
        </svg>
        {action}
      </button>
    </div>
  );
}

/* ── Nav icons ── */

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const cls = `h-[16px] w-[16px] shrink-0 transition-colors duration-150 ${
    active ? "text-white" : "text-[#62666d] group-hover:text-[#8a8f98]"
  }`;
  const shared = {
    className: cls,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "film":
      return (
        <svg {...shared}>
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M6 2v12M10 2v12" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...shared}>
          <path d="M13 3v10l-7-2.5V5.5L13 3Z" />
          <path d="M6 5.5H4.5a1.5 1.5 0 0 0 0 3H6" />
          <path d="M6 8.5v3a1 1 0 0 0 1 1h.5" />
        </svg>
      );
    case "eye":
      return (
        <svg {...shared}>
          <path d="M2 8s2.5-4.5 6-4.5S14 8 14 8s-2.5 4.5-6 4.5S2 8 2 8Z" />
          <circle cx="8" cy="8" r="2" />
        </svg>
      );
    case "brain":
      return (
        <svg {...shared}>
          <path d="M8 2v12" />
          <path d="M8 4c-1.5-1.5-4-1-4 1.5S6 8 8 8c-2 0-4.5.5-4 3s2.5 3 4 1.5" />
          <path d="M8 4c1.5-1.5 4-1 4 1.5S10 8 8 8c2 0 4.5.5 4 3s-2.5 3-4 1.5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...shared}>
          <path d="M2 14h12" />
          <path d="M4 14V9M7 14V5M10 14V8M13 14V3" />
        </svg>
      );
    case "gear":
      return (
        <svg {...shared}>
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M12.7 3.3l-1.4 1.4M4.7 11.3l-1.4 1.4" />
        </svg>
      );
    default:
      return null;
  }
}

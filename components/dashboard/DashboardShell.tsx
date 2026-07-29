"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { BrainTab } from "./BrainTab";
import { GoogleAdsTab } from "./GoogleAdsTab";

type Tab = "keywords" | "competitors" | "brain" | "googleAds" | "metrics" | "settings";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "keywords", label: "Keywords", icon: "tag" },
  { id: "competitors", label: "Competitors", icon: "eye" },
  { id: "brain", label: "Brain", icon: "brain" },
  { id: "googleAds", label: "Google Ads", icon: "google" },
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
  const [active, setActive] = useState<Tab>("brain");

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

        <main className="flex-1 overflow-y-auto">
          <div key={active} className="mx-auto max-w-[1000px] px-6 py-8">
            {active === "brain" && <BrainTab />}
            {active === "googleAds" && <GoogleAdsTab />}
            {active === "keywords" && <PlaceholderPanel title="Keywords" body="Track trending ad keywords and messaging hooks across your campaigns." />}
            {active === "competitors" && <PlaceholderPanel title="Competitors" body="Scrape competitor ads from the open web and score them on the same brain → metric stack." />}
            {active === "metrics" && <PlaceholderPanel title="Metrics" body="Predicted average CTR results and model runtime details across analyzed creatives." />}
            {active === "settings" && <PlaceholderPanel title="Settings" body="Manage your workspace, team members, and API integrations." />}
          </div>
        </main>
      </div>
    </div>
  );
}

function PlaceholderPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]">
      <p className="text-[14px] leading-6 text-secondary">{body}</p>
      <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.015] py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
          <svg className="h-6 w-6 text-white/30" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </div>
        <p className="mt-4 text-[15px] font-medium text-white">No {title.toLowerCase()} yet</p>
        <p className="mt-1.5 max-w-[300px] text-center text-[13px] leading-5 text-secondary">
          This feature will be available soon.
        </p>
      </div>
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
    case "tag":
      return (
        <svg {...shared}>
          <path d="M2 8.5V3a1 1 0 011-1h5.5L14 7.5 8.5 13 2 8.5Z" />
          <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
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
    case "google":
      return (
        <svg {...shared} viewBox="0 0 24 24" strokeWidth={0} fill="currentColor">
          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 6.721 2 2 6.721 2 12.545S6.721 23.09 12.545 23.09c6.627 0 10.5-4.664 10.5-10.732 0-.663-.067-1.309-.172-1.921h-10.328z" />
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

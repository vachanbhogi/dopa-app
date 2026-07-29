"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardTab } from "@/components/dashboard/DashboardShell";
import { NavIcon } from "@/components/dashboard/DashboardShell";
import { AutoCampaignTab } from "@/components/dashboard/AutoCampaignTab";
import { BrainTab } from "@/components/dashboard/BrainTab";
import { BusinessTab } from "@/components/dashboard/BusinessTab";
import { CommandMenu } from "@/components/dashboard/CommandMenu";
import { CompetitorsTab } from "@/components/dashboard/CompetitorsTab";
import { GoogleAdsTab } from "@/components/dashboard/GoogleAdsTab";
import { KeywordsTab } from "@/components/dashboard/KeywordsTab";
import { ProductsTab } from "@/components/dashboard/ProductsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { DEMO_CTA_MESSAGE, DEMO_SIGNUP_HREF } from "@/lib/demo/fixtures";
import {
  defaultDemoWorkspace,
  loadDemoWorkspace,
  type DemoWorkspace,
} from "@/lib/demo/workspace";
import {
  accountDropdown,
  businessDropdown,
  commandBar,
  dropdownItem,
  headerLink,
  navItemActive,
  navItemIdle,
} from "@/lib/dashboard-ui";

const tabs: { id: DashboardTab; label: string; icon: string }[] = [
  { id: "business", label: "Business", icon: "gear" },
  { id: "competitors", label: "Competitors", icon: "eye" },
  { id: "products", label: "Products", icon: "box" },
  { id: "keywords", label: "Keywords", icon: "tag" },
  { id: "autoCampaign", label: "Auto Launcher", icon: "sparkles" },
  { id: "brain", label: "Brain", icon: "brain" },
  { id: "googleAds", label: "Google Ads", icon: "google" },
];

function isDashboardTab(value: string | null): value is DashboardTab {
  return (
    value === "settings" ||
    (value !== null && tabs.some((tab) => tab.id === value))
  );
}

export function DemoDashboardShell({
  initialTab = "brain",
}: {
  initialTab?: DashboardTab;
}) {
  const [workspace, setWorkspace] = useState<DemoWorkspace | null>(null);
  const [active, setActive] = useState<DashboardTab>(initialTab);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [businessMenuOpen, setBusinessMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const businessMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const loaded = loadDemoWorkspace() ?? defaultDemoWorkspace();
      setWorkspace(loaded);
      setSelectedBusinessId(loaded.businesses[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!businessMenuOpen && !accountMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        businessMenuOpen &&
        !businessMenuRef.current?.contains(event.target)
      ) {
        setBusinessMenuOpen(false);
      }
      if (
        accountMenuOpen &&
        !accountMenuRef.current?.contains(event.target)
      ) {
        setAccountMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBusinessMenuOpen(false);
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [businessMenuOpen, accountMenuOpen]);

  useEffect(() => {
    const handleHistoryChange = () => {
      const tab = new URL(window.location.href).searchParams.get("tab");
      if (isDashboardTab(tab)) setActive(tab);
    };
    queueMicrotask(() => {
      const url = new URL(window.location.href);
      const tab = url.searchParams.get("tab");
      if (isDashboardTab(tab)) {
        setActive(tab);
        return;
      }
      // Onboarding lands ?tab=brain; bare /demo/dashboard also defaults there.
      url.searchParams.set("tab", initialTab);
      window.history.replaceState(null, "", url);
      setActive(initialTab);
    });
    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, [initialTab]);

  const businesses = workspace?.businesses ?? [];
  const selectedBusiness = useMemo(
    () =>
      businesses.find((business) => business.id === selectedBusinessId) ??
      businesses[0],
    [businesses, selectedBusinessId],
  );
  const businessInitial = selectedBusiness?.name[0]?.toUpperCase() ?? "B";
  const activeTabLabel =
    active === "settings"
      ? "Settings"
      : (tabs.find((t) => t.id === active)?.label ?? "Dashboard");

  const selectTab = (tab: DashboardTab) => {
    setActive(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState(null, "", url);
  };

  if (!workspace || !selectedBusiness) {
    return (
      <div className="flex h-full items-center justify-center bg-[#08090a] text-[13px] text-secondary">
        Loading demo workspace…
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#08090a] text-foreground md:flex-row">
      <div
        className="dopa-grain pointer-events-none absolute inset-0 z-0 opacity-30"
        aria-hidden
      />

      <aside className="relative z-10 flex w-full shrink-0 flex-col border-b border-white/6 bg-[#08090a] md:w-55 md:border-b-0">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(88,92,140,0.08),transparent_55%)]"
          aria-hidden
        />

        <div
          className="relative border-b border-white/6 px-3 py-3 md:border-b-0"
          ref={businessMenuRef}
        >
          <button
            type="button"
            onClick={() => {
              setAccountMenuOpen(false);
              setBusinessMenuOpen((open) => !open);
            }}
            aria-haspopup="listbox"
            aria-expanded={businessMenuOpen}
            className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-[background-color] duration-150 hover:bg-white/4 active:scale-[0.99]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
              {businessInitial}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight text-white">
              {selectedBusiness.name}
            </span>
            <span className="rounded border border-brand/30 bg-brand/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-accent">
              Demo
            </span>
          </button>

          {businessMenuOpen ? (
            <div role="listbox" className={businessDropdown}>
              {businesses.map((business) => {
                const isSelected = business.id === selectedBusinessId;
                return (
                  <button
                    key={business.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedBusinessId(business.id);
                      setBusinessMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] ${
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
              <Link
                href="/demo"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-secondary hover:bg-white/4 hover:text-white"
                onClick={() => setBusinessMenuOpen(false)}
              >
                Restart onboarding
              </Link>
            </div>
          ) : null}
        </div>

        <nav
          className="relative flex gap-0.5 overflow-x-auto px-2 py-2 md:flex-1 md:block md:space-y-0.5 md:pt-3"
          aria-label="Dashboard"
        >
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`group relative flex w-auto shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.25 text-[13px] transition-[background-color,color] duration-150 active:scale-[0.98] md:w-full ${
                  isActive ? navItemActive : navItemIdle
                }`}
              >
                <NavIcon name={tab.icon} active={isActive} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div
          className="relative flex items-center gap-1.5 px-3 pb-3"
          ref={accountMenuRef}
        >
          <button
            type="button"
            onClick={() => {
              setBusinessMenuOpen(false);
              setAccountMenuOpen((open) => !open);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/25 text-[10px] font-medium text-brand">
              DV
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-secondary">
              demo@dopa.ai
            </span>
          </button>

          {accountMenuOpen ? (
            <div role="menu" className={accountDropdown}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  selectTab("settings");
                  setAccountMenuOpen(false);
                }}
                className={dropdownItem}
              >
                Settings
              </button>
              <div className="my-1 border-t border-white/8" />
              <Link
                href="/demo"
                role="menuitem"
                className={dropdownItem}
                onClick={() => setAccountMenuOpen(false)}
              >
                Restart onboarding
              </Link>
              <Link
                href={DEMO_SIGNUP_HREF}
                role="menuitem"
                className={dropdownItem}
                onClick={() => setAccountMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative flex h-13 shrink-0 items-center px-4 sm:px-6">
          <div className="z-10 flex min-w-0 shrink-0 items-center gap-2">
            <span className="truncate text-[12px] text-tertiary">
              {selectedBusiness.name}
            </span>
            <span className="text-tertiary/50">/</span>
            <h1 className="truncate text-[15px] font-medium text-white">
              {activeTabLabel}
            </h1>
          </div>

          <div className="pointer-events-none absolute inset-x-4 hidden justify-center sm:inset-x-6 md:flex">
            <button
              type="button"
              onClick={() => setCommandMenuOpen(true)}
              className={`${commandBar} pointer-events-auto cursor-pointer`}
            >
              <span className="flex-1 text-left text-secondary">
                Search or command…
              </span>
              <kbd className="rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-mono text-[10px] text-tertiary">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="z-10 ml-auto flex items-center justify-end gap-1">
            <Link href="/demo" className={headerLink}>
              Onboarding
            </Link>
            <Link href="/" className={headerLink}>
              Home
            </Link>
            <Link
              href={DEMO_SIGNUP_HREF}
              className="ml-1 inline-flex h-7.5 items-center rounded-full border border-white/15 bg-white/4 px-3 text-[12px] text-white transition-colors hover:bg-white/8 active:scale-[0.97]"
            >
              Sign up
            </Link>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto pb-20">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_50%_0%,rgba(88,92,140,0.12),transparent_65%)]"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 sm:pt-6 md:px-8">
            <div className="dopa-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary">
                  Recommended next step
                </p>
                <p className="mt-1 text-[13px] text-secondary sm:text-[14px]">
                  {active === "brain"
                    ? "Upload a creative to score CTR, or open Auto Campaign to launch from your brand profile."
                    : active === "autoCampaign"
                      ? "Review the generated blueprint, then return to Brain to score a creative."
                      : "Score a creative in Brain, or open Auto Campaign when you’re ready to launch."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {active !== "brain" ? (
                  <button
                    type="button"
                    onClick={() => selectTab("brain")}
                    className="inline-flex h-8 items-center rounded-lg bg-brand px-3 text-[12px] font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97]"
                  >
                    Upload a creative
                  </button>
                ) : (
                  <span className="inline-flex h-8 items-center rounded-lg border border-brand/30 bg-brand/10 px-3 text-[12px] font-medium text-brand">
                    On Brain · upload below
                  </span>
                )}
                {active !== "autoCampaign" ? (
                  <button
                    type="button"
                    onClick={() => selectTab("autoCampaign")}
                    className="inline-flex h-8 items-center rounded-lg border border-white/10 px-3 text-[12px] text-secondary transition-[background-color,color,transform] duration-150 hover:bg-white/4 hover:text-white active:scale-[0.97]"
                  >
                    Open Auto Campaign
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div
            key={active}
            className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-8"
          >
            {active === "business" ? (
              <BusinessTab
                key={selectedBusinessId}
                businesses={businesses}
                selectedBusinessId={selectedBusinessId}
                onSelectBusiness={setSelectedBusinessId}
                demoMode
              />
            ) : null}
            {active === "competitors" ? (
              <CompetitorsTab
                business={selectedBusiness}
                demoMode
                initialCompetitors={workspace.competitors}
                initialRun={workspace.competitorRun}
                initialSettings={workspace.competitorSettings}
              />
            ) : null}
            {active === "products" ? (
              <ProductsTab
                businessId={selectedBusiness.id}
                business={selectedBusiness}
                demoMode
                initialProducts={workspace.products}
              />
            ) : null}
            {active === "keywords" ? (
              <KeywordsTab business={selectedBusiness} />
            ) : null}
            {active === "autoCampaign" ? (
              <AutoCampaignTab
                business={selectedBusiness}
                demoMode
                initialProducts={workspace.products}
              />
            ) : null}
            {active === "brain" ? (
              <BrainTab demoMode initialResult={workspace.brainScore} />
            ) : null}
            {active === "googleAds" ? (
              <GoogleAdsTab
                dopaEmail="demo@dopa.ai"
                demoMode
                initialCampaigns={workspace.campaigns}
                initialAccount={workspace.googleAdsAccount}
              />
            ) : null}
            {active === "settings" ? (
              <SettingsTab displayName="Demo Visitor" email="demo@dopa.ai" />
            ) : null}
          </div>
        </main>

        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/8 bg-[#08090a]/92 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-[12px] leading-5 text-secondary sm:text-[13px]">
              {DEMO_CTA_MESSAGE}
            </p>
            <Link
              href={DEMO_SIGNUP_HREF}
              className="inline-flex h-9 shrink-0 items-center rounded-lg bg-white px-4 text-[13px] font-medium text-[#08090a] transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.97]"
            >
              Ready to build for your brand?
            </Link>
          </div>
        </div>
      </div>

      <CommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        onSelectTab={selectTab}
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        onSelectBusiness={setSelectedBusinessId}
      />
    </div>
  );
}

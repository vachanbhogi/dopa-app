"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { selectBusiness } from "@/app/dashboard/actions";
import type { Business } from "@/lib/business-types";
import {
  accountDropdown,
  businessDropdown,
  commandBar,
  dropdownItem,
  headerLink,
  headerLogoutButton,
  navItemActive,
  navItemIdle,
} from "@/lib/dashboard-ui";
import { BrainTab } from "./BrainTab";
import { BusinessTab } from "./BusinessTab";
import { CommandMenu } from "./CommandMenu";
import { CompetitorsTab } from "./CompetitorsTab";
import { GoogleAdsTab } from "./GoogleAdsTab";
import { KeywordsTab } from "./KeywordsTab";
import { ProductsTab } from "./ProductsTab";
import { SettingsTab } from "./SettingsTab";

export type DashboardTab =
  | "business"
  | "competitors"
  | "products"
  | "keywords"
  | "brain"
  | "googleAds"
  | "settings";

const tabs: { id: DashboardTab; label: string; icon: string }[] = [
  { id: "business", label: "Business", icon: "gear" },
  { id: "competitors", label: "Competitors", icon: "eye" },
  { id: "products", label: "Products", icon: "box" },
  { id: "keywords", label: "Keywords", icon: "tag" },
  { id: "brain", label: "Brain", icon: "brain" },
  { id: "googleAds", label: "Google Ads", icon: "google" },
];

function isDashboardTab(value: string | null): value is DashboardTab {
  return value === "settings" || (value !== null && tabs.some((tab) => tab.id === value));
}

export function DashboardShell({
  displayName,
  email,
  businesses,
  initialSelectedBusinessId,
  initialTab = "brain",
  googleAdsResult,
}: {
  displayName: string;
  email: string;
  businesses: Business[];
  initialSelectedBusinessId: string | null;
  initialTab?: DashboardTab;
  googleAdsResult?: string;
}) {
  const [active, setActive] = useState<DashboardTab>(initialTab);
  const [selectedBusinessId, setSelectedBusinessId] = useState(
    initialSelectedBusinessId ?? businesses[0]?.id ?? "",
  );
  const [businessMenuOpen, setBusinessMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const businessMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [isSelectingBusiness, startSelectBusiness] = useTransition();

  const selectedBusiness =
    businesses.find((business) => business.id === selectedBusinessId) ?? businesses[0];
  const businessInitial = selectedBusiness?.name[0]?.toUpperCase() ?? "B";
  const activeTabLabel =
    active === "settings"
      ? "Settings"
      : (tabs.find((t) => t.id === active)?.label ?? "Dashboard");

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
      if (isDashboardTab(tab)) {
        setActive(tab);
      }
    };
    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, []);

  const selectTab = (tab: DashboardTab) => {
    setActive(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    if (tab !== "googleAds") url.searchParams.delete("googleAds");
    window.history.pushState(null, "", url);
  };

  return (
    <div className="relative flex h-dvh flex-col bg-[#08090a] text-foreground md:h-screen md:flex-row">
      <div className="dopa-grain pointer-events-none absolute inset-0 z-0 opacity-30" aria-hidden />

      {/* ── Sidebar ── */}
      <aside className="relative z-10 flex w-full shrink-0 flex-col border-b border-white/6 bg-[#08090a] md:w-55 md:border-b-0">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(88,92,140,0.08),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-3 right-0 hidden w-px bg-gradient-to-b from-transparent via-white/6 to-transparent md:block"
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
            disabled={!selectedBusiness || isSelectingBusiness}
            aria-haspopup="listbox"
            aria-expanded={businessMenuOpen}
            aria-label="Select business"
            className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-[background-color] duration-150 hover:bg-white/4 active:scale-[0.99] disabled:opacity-60"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
              {businessInitial}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight text-white">
              {selectedBusiness?.name ?? "No business"}
            </span>
            <svg
              className={`h-3.5 w-3.5 shrink-0 text-secondary transition-transform duration-150 ${businessMenuOpen ? "rotate-180" : ""}`}
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

          {businessMenuOpen ? (
            <div
              role="listbox"
              aria-label="Businesses"
              className={businessDropdown}
            >
              {businesses.map((business) => {
                const isSelected = business.id === selectedBusinessId;
                return (
                  <button
                    key={business.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={isSelectingBusiness}
                    onClick={() => {
                      const previousBusinessId = selectedBusinessId;
                      setSelectedBusinessId(business.id);
                      setBusinessMenuOpen(false);
                      setBusinessError(null);
                      startSelectBusiness(async () => {
                        const result = await selectBusiness(business.id);
                        if (result.error) {
                          setSelectedBusinessId(previousBusinessId);
                          setBusinessError(result.error);
                        }
                      });
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
                  setBusinessMenuOpen(false);
                  selectTab("business");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-secondary transition-[background-color,color] duration-150 hover:bg-white/4 hover:text-white"
              >
                Manage businesses
              </button>
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

        <div className="relative flex items-center gap-1.5 px-3 pb-3" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => {
              setBusinessMenuOpen(false);
              setAccountMenuOpen((open) => !open);
            }}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            aria-label="Account menu"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/25 text-[10px] font-medium text-brand">
              {initials}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-secondary">
              {email}
            </span>
            <svg
              className={`h-3.5 w-3.5 shrink-0 text-tertiary transition-transform duration-150 ${accountMenuOpen ? "rotate-180" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>

          {accountMenuOpen ? (
            <div role="menu" aria-label="Account" className={accountDropdown}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  selectTab("settings");
                  setAccountMenuOpen(false);
                }}
                className={dropdownItem}
              >
                <svg
                  className="h-4 w-4 text-tertiary"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <circle cx="8" cy="8" r="2.5" />
                  <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" />
                </svg>
                Settings
              </button>
              <div className="my-1 border-t border-white/8" />
              <form action={signOut}>
                <button type="submit" role="menuitem" className={dropdownItem}>
                  <svg
                    className="h-4 w-4 text-tertiary"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M6 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H6M10 11l3-3-3-3M13 8H6" />
                  </svg>
                  Log out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative flex h-13 shrink-0 items-center px-4 sm:px-6">
          <div className="z-10 flex min-w-0 shrink-0 items-center gap-2">
            <span className="truncate text-[12px] text-tertiary">{selectedBusiness?.name}</span>
            <span className="text-tertiary/50">/</span>
            <h1 className="truncate text-[15px] font-medium text-white">{activeTabLabel}</h1>
          </div>

          <div className="pointer-events-none absolute inset-x-4 hidden justify-center sm:inset-x-6 md:flex">
            <button
              type="button"
              onClick={() => setCommandMenuOpen(true)}
              className={`${commandBar} pointer-events-auto cursor-pointer`}
              aria-label="Open command menu"
            >
              <svg
                className="h-3.5 w-3.5 shrink-0 text-tertiary"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L13 13" />
              </svg>
              <span className="flex-1 text-left text-secondary">Search or command…</span>
              <kbd className="rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-mono text-[10px] text-tertiary">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="z-10 ml-auto flex items-center justify-end gap-1">
            <Link href="/" className={headerLink}>
              Home
            </Link>
            <form action={signOut} className="ml-1 inline">
              <button type="submit" className={headerLogoutButton}>
                Log out
              </button>
            </form>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_50%_0%,rgba(88,92,140,0.12),transparent_65%)]"
            aria-hidden
          />
          <div key={active} className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
            {businessError ? (
              <p
                role="alert"
                className="mb-5 rounded-lg border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-[12px] text-red-200"
              >
                {businessError}
              </p>
            ) : null}
            {active === "business" && (
              <BusinessTab
                key={selectedBusinessId}
                businesses={businesses}
                selectedBusinessId={selectedBusinessId}
                onSelectBusiness={(id) => {
                  const previousBusinessId = selectedBusinessId;
                  setSelectedBusinessId(id);
                  setBusinessError(null);
                  startSelectBusiness(async () => {
                    const result = await selectBusiness(id);
                    if (result.error) {
                      setSelectedBusinessId(previousBusinessId);
                      setBusinessError(result.error);
                    }
                  });
                }}
              />
            )}
            {active === "competitors" && selectedBusiness ? (
              <CompetitorsTab business={selectedBusiness} />
            ) : null}

            {active === "products" && selectedBusiness ? (
              <ProductsTab
                businessId={selectedBusiness.id}
                business={selectedBusiness}
              />
            ) : null}
            {active === "keywords" && selectedBusiness ? (
              <KeywordsTab business={selectedBusiness} />
            ) : null}
            {active === "brain" && <BrainTab />}
            {active === "googleAds" && (
              <GoogleAdsTab
                dopaEmail={email}
                oauthResult={googleAdsResult}
              />
            )}
            {active === "settings" && (
              <SettingsTab displayName={displayName} email={email} />
            )}
          </div>
        </main>
      </div>

      <CommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        onSelectTab={selectTab}
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        onSelectBusiness={(id) => {
          const previousBusinessId = selectedBusinessId;
          setSelectedBusinessId(id);
          setBusinessError(null);
          startSelectBusiness(async () => {
            const result = await selectBusiness(id);
            if (result.error) {
              setSelectedBusinessId(previousBusinessId);
              setBusinessError(result.error);
            }
          });
        }}
      />
    </div>
  );
}

/* ── Nav icons ── */
export function NavIcon({ name, active }: { name: string; active?: boolean }) {
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
    case "box":
      return (
        <svg {...shared}>
          <path d="M3 5.5 8 3l5 2.5V11L8 13.5 3 11V5.5Z" />
          <path d="M8 3v10.5M3 5.5l5 2.5 5-2.5" />
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
    case "denver":
      return (
        <svg {...shared} viewBox="0 0 16 16" strokeWidth={0} fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
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

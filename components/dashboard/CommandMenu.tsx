"use client";

import { useEffect } from "react";
import { Command } from "cmdk";
import { type DashboardTab, NavIcon } from "./DashboardShell";
import type { Business } from "@/lib/business-types";

type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTab: (tab: DashboardTab) => void;
  businesses: Business[];
  selectedBusinessId: string;
  onSelectBusiness: (businessId: string) => void;
};

const navigationItems: { id: DashboardTab; label: string; icon: string }[] = [
  { id: "business", label: "Business", icon: "gear" },
  { id: "competitors", label: "Competitors", icon: "eye" },
  { id: "products", label: "Products", icon: "box" },
  { id: "keywords", label: "Keywords", icon: "tag" },
  { id: "brain", label: "Brain", icon: "brain" },
  { id: "googleAds", label: "Google Ads", icon: "google" },
];

export function CommandMenu({
  open,
  onOpenChange,
  onSelectTab,
  businesses,
  selectedBusinessId,
  onSelectBusiness,
}: CommandMenuProps) {
  const otherBusinesses = businesses.filter((b) => b.id !== selectedBusinessId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-150 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-xs p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-[#0f1011] shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-fade-up dopa-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full">
          {/* Header Search Field */}
          <div className="flex items-center border-b border-white/8 px-4">
            <svg
              className="mr-3 h-4 w-4 shrink-0 text-tertiary"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L13 13" />
            </svg>
            <Command.Input
              autoFocus
              placeholder="Search views, products, or actions…"
              className="h-12 w-full bg-transparent text-[14px] text-white outline-none placeholder:text-tertiary"
            />
            <kbd className="rounded border border-white/10 bg-white/6 px-1.5 py-0.5 text-[10px] text-tertiary">
              ESC
            </kbd>
          </div>

          {/* Search Items */}
          <Command.List className="max-h-80 overflow-y-auto p-2 text-white">
            <Command.Empty className="p-4 text-center text-[13px] text-tertiary">
              No matching commands found.
            </Command.Empty>

            {/* Navigation Category */}
            <Command.Group
              heading="Navigation"
              className="px-2 py-1.5 text-[11px] font-medium tracking-wide text-tertiary uppercase"
            >
              {navigationItems.map((item) => (
                <Command.Item
                  key={item.id}
                  onSelect={() => {
                    onSelectTab(item.id);
                    onOpenChange(false);
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-secondary transition-colors data-[selected=true]:bg-white/8 data-[selected=true]:text-white"
                >
                  <NavIcon name={item.icon} active={false} />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Workspaces Category */}
            {otherBusinesses.length > 0 ? (
              <Command.Group
                heading="Workspaces"
                className="mt-2 px-2 py-1.5 text-[11px] font-medium tracking-wide text-tertiary uppercase"
              >
                {otherBusinesses.map((b) => (
                  <Command.Item
                    key={b.id}
                    onSelect={() => {
                      onSelectBusiness(b.id);
                      onOpenChange(false);
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-secondary transition-colors data-[selected=true]:bg-white/8 data-[selected=true]:text-white"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand/20 text-[10px] font-semibold text-brand">
                      {b.name[0]?.toUpperCase()}
                    </span>
                    <span>Switch to {b.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

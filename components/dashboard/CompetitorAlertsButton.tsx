"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompetitorAlertDto } from "@/lib/competitor-intelligence/types";
import { isJsonObject } from "@/lib/validation";

export function CompetitorAlertsButton({
  businessId,
  onOpenCompetitors,
}: {
  businessId: string;
  onOpenCompetitors: () => void;
}) {
  const [alerts, setAlerts] = useState<CompetitorAlertDto[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/competitors/alerts?businessId=${encodeURIComponent(businessId)}`,
        { cache: "no-store" },
      );
      const data: unknown = await response.json();
      if (response.ok && isJsonObject(data) && Array.isArray(data.alerts)) {
        setAlerts(data.alerts as CompetitorAlertDto[]);
      }
    } catch {
      // Alert polling is non-blocking; the Competitors tab shows full errors.
    }
  }, [businessId]);

  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = window.setInterval(() => void load(), 30_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const unread = alerts.filter((alert) => !alert.read_at).length;

  async function openAlert(alert: CompetitorAlertDto) {
    if (!alert.read_at) {
      setAlerts((current) =>
        current.map((item) =>
          item.id === alert.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
      await fetch("/api/competitors/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id }),
      });
    }
    setOpen(false);
    onOpenCompetitors();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unread > 0
            ? `${unread} unread competitor alerts`
            : "Competitor alerts"
        }
        aria-expanded={open}
        className="relative flex h-7.5 w-7.5 items-center justify-center rounded-full border border-white/10 bg-white/4 text-secondary transition-colors hover:bg-white/8 hover:text-white"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M3.5 11.5h9l-1-1.8V6a3.5 3.5 0 00-7 0v3.7l-1 1.8Z" />
          <path d="M6.5 13a1.6 1.6 0 003 0" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[8px] font-semibold text-white">
            {Math.min(unread, 9)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+8px)] right-0 z-60 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-[#111114] shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
          <div className="border-b border-white/7 px-4 py-3">
            <p className="text-[12px] font-medium text-white">
              Competitor alerts
            </p>
            <p className="mt-0.5 text-[10px] text-tertiary">
              Evidence-backed changes worth reviewing
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => void openAlert(alert)}
                  className="flex w-full gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      alert.read_at ? "bg-white/15" : "bg-brand"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-medium text-white">
                      {alert.title}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-secondary">
                      {alert.body}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-8 text-center text-[11px] text-tertiary">
                No competitor alerts yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

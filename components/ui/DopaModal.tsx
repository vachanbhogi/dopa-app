"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { DopaMark } from "@/components/landing/icons";

const subscribeToClient = () => () => {};

export function DopaModal({
  title,
  subtitle,
  onClose,
  closeHref,
  size = "default",
  children,
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  closeHref?: string;
  size?: "default" | "wide";
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

  const closeClassName =
    "flex h-7 w-7 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-white/6 hover:text-white";

  if (!mounted) return null;

  const widthClass = size === "wide" ? "max-w-3xl" : "max-w-105";

  return createPortal(
    <div
      className="fixed inset-0 z-120 overflow-y-auto bg-black/75 p-5 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-[calc(100vh-2.5rem)] items-center justify-center">
        <div className={`relative my-auto w-full ${widthClass} animate-fade-up`}>
          <div
            className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(88,92,140,0.08),transparent_75%)]"
            aria-hidden
          />

          <div
            className="relative flex max-h-[calc(100vh-2.5rem)] flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0f1011] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dopa-modal-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/6 px-5 py-3.5 sm:px-6">
              <div className="flex items-center gap-2 text-white">
                <DopaMark className="h-4.5 w-4.5" />
                <span className="text-[15px] font-[510] tracking-[-0.01em]">Dopa</span>
              </div>
              {closeHref ? (
                <Link href={closeHref} aria-label="Close" className={closeClassName}>
                  <CloseIcon />
                </Link>
              ) : (
                <button type="button" onClick={onClose} aria-label="Close" className={closeClassName}>
                  <CloseIcon />
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-6 pb-5 sm:px-6 sm:pt-7 sm:pb-6">
              <h1
                id="dopa-modal-title"
                className="text-[22px] font-semibold tracking-[-0.02em] text-white sm:text-[24px]"
              >
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-[13px] leading-6 text-secondary">{subtitle}</p>
              ) : null}
              <div className="mt-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export const dopaInputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-[#0c0d0e] px-3 text-[14px] text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-tertiary hover:border-white/15 focus:border-brand focus:ring-1 focus:ring-brand/40";

export const dopaTextareaClass =
  "min-h-[4.5rem] w-full resize-none rounded-lg border border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-[14px] text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-tertiary hover:border-white/15 focus:border-brand focus:ring-1 focus:ring-brand/40";

export const dopaPrimaryButtonClass =
  "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50";

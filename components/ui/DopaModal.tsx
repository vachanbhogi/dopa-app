"use client";

import { DopaMark } from "@/components/landing/icons";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

const subscribeToClient = () => () => {};
const MODAL_EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

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
  const router = useRouter();
  const prefersReducedMotion = useSyncReducedMotion();
  const motionMs = prefersReducedMotion ? 150 : 250;
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  const finishClose = useCallback(() => {
    if (closeHref) {
      router.push(closeHref);
      return;
    }
    onClose?.();
  }, [closeHref, onClose, router]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      finishClose();
    }, motionMs);
  }, [finishClose, motionMs]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [requestClose]);

  const closeClassName =
    "flex h-7 w-7 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-white/6 hover:text-white";

  if (!mounted) return null;

  const widthClass = size === "wide" ? "max-w-3xl" : "max-w-105";
  const transitionProperty = prefersReducedMotion
    ? "opacity"
    : "opacity, transform";
  const panelMotion = prefersReducedMotion
    ? visible
      ? "opacity-100"
      : "opacity-0"
    : visible
      ? "opacity-100 scale-100"
      : "opacity-0 scale-[0.97]";

  return createPortal(
    <div
      className="fixed inset-0 z-120 overflow-y-auto bg-black/75 p-5 backdrop-blur-sm"
      style={{
        opacity: visible ? 1 : 0,
        transitionProperty: "opacity",
        transitionDuration: `${motionMs}ms`,
        transitionTimingFunction: MODAL_EASE,
      }}
      onClick={requestClose}
      role="presentation"
    >
      <div className="flex min-h-[calc(100vh-2.5rem)] items-center justify-center">
        <div
          className={`relative my-auto w-full ${widthClass} ${panelMotion}`}
          style={{
            transitionProperty,
            transitionDuration: `${motionMs}ms`,
            transitionTimingFunction: MODAL_EASE,
          }}
        >
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
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className={closeClassName}
              >
                <CloseIcon />
              </button>
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

function useSyncReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
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
  "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.99] disabled:opacity-50";

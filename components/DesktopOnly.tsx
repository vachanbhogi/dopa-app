import Link from "next/link";
import { DopaMark } from "@/components/landing/icons";

type Surface = "demo" | "dashboard";

const copy: Record<
  Surface,
  { title: string; body: string; eyebrow: string }
> = {
  demo: {
    eyebrow: "Demo",
    title: "Not available on mobile",
    body: "The Dopa demo needs a larger screen for brand intake and the workspace walkthrough. Open this page on a laptop or desktop to continue.",
  },
  dashboard: {
    eyebrow: "Dashboard",
    title: "Not available on mobile",
    body: "The Dopa workspace is built for desktop review — cortical playback, competitor intel, and campaign ops. Switch to a wider screen to continue.",
  },
};

/**
 * CSS-only gate: shows an unavailable state below `md`, and renders children
 * unchanged from `md` up (`contents` keeps layout parents intact).
 */
export function DesktopOnly({
  children,
  surface,
}: {
  children: React.ReactNode;
  surface: Surface;
}) {
  const text = copy[surface];

  return (
    <>
      <div className="relative flex min-h-dvh flex-col bg-[#08090a] text-white md:hidden">
        <div className="dopa-grain pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <Link
            href="/"
            className="mb-10 flex items-center gap-2 text-white"
            aria-label="Dopa home"
          >
            <DopaMark className="h-4.5 w-4.5" />
            <span className="text-[15px] font-[510] tracking-[-0.01em]">
              Dopa
            </span>
          </Link>

          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f86ff]">
            {text.eyebrow}
          </p>
          <h1 className="mt-3 max-w-sm text-[28px] font-medium leading-tight tracking-[-0.03em]">
            {text.title}
          </h1>
          <p className="mt-4 max-w-sm text-[14px] leading-6 text-[#8a8f98]">
            {text.body}
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/4 px-4 text-[13px] text-white transition-colors hover:bg-white/8"
          >
            Back to home
          </Link>
        </div>
      </div>

      <div className="hidden md:contents">{children}</div>
    </>
  );
}

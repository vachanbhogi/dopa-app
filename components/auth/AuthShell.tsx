import Link from "next/link";
import { DopaMark } from "@/components/landing/icons";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="pointer-events-none absolute inset-0 dopa-grain opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-105 bg-[radial-gradient(ellipse_at_50%_0%,rgba(94,106,210,0.2),transparent_60%)]" />

      <div className="relative w-full max-w-100">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-white"
          aria-label="Dopa home"
        >
          <DopaMark className="h-4.5 w-4.5" />
          <span className="text-[15px] font-[510] tracking-[-0.01em]">Dopa</span>
        </Link>

        <div className="dopa-panel p-8">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-[14px] leading-6 text-secondary">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

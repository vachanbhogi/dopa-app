"use client";

import Link from "next/link";
import { DopaMark } from "@/components/landing/icons";
import { DEMO_SIGNUP_HREF } from "@/lib/demo/fixtures";

const nav = [
  { label: "Features", href: "/#pipeline" },
  { label: "Demo", href: "/demo" },
  { label: "Dashboard", href: "/demo/dashboard" },
  { label: "Privacy", href: "/privacy" },
];

/** Lightweight public header — used where a full dashboard chrome is not needed. */
export function DemoHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-50 border-b border-white/6 bg-[#070809]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-300 items-center justify-between gap-4 px-5 md:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-white"
          aria-label="Dopa"
        >
          <DopaMark className="h-4.5 w-4.5" />
          <span className="text-[15px] font-[510] tracking-[-0.01em]">Dopa</span>
        </Link>

        <div className="flex min-w-0 items-center justify-end gap-1">
          <nav
            className="mr-1 hidden items-center sm:flex"
            aria-label="Primary"
          >
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="inline-flex items-center px-2.5 py-1.5 text-[13px] text-[#b4bcd0] transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mx-1.5 hidden h-4 w-px shrink-0 bg-white/10 sm:block" />

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/?modal=login&redirectTo=%2Fdashboard"
              className="px-2.5 py-1.5 text-[13px] text-[#b4bcd0] transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              href={DEMO_SIGNUP_HREF}
              className="inline-flex h-7.5 items-center rounded-full border border-white/15 bg-white/4 px-3.5 text-[13px] text-white transition-[transform,background-color] duration-150 hover:bg-white/8 active:scale-[0.97]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

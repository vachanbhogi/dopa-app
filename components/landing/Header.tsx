import Link from "next/link";
import { AuthLinks } from "@/components/auth/AuthLinks";
import { DopaMark } from "./icons";

const nav = [
  { label: "Features", href: "#pipeline" },
  { label: "Demo", href: "/demo" },
  { label: "Privacy", href: "/privacy" },
];

export async function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-300 items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-white"
          aria-label="Dopa"
        >
          <DopaMark className="h-4.5 w-4.5" />
          <span className="text-[15px] font-[510] tracking-[-0.01em]">Dopa</span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="mr-2 hidden items-center lg:flex" aria-label="Primary">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href ?? "#"}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[13px] text-[#b4bcd0] transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mx-2 hidden h-4 w-px bg-white/10 lg:block" />

          <AuthLinks />
        </div>
      </div>
    </header>
  );
}

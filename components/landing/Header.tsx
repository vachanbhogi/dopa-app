import Link from "next/link";
import { AuthLinks } from "@/components/auth/AuthLinks";
import { ChevronDown, DopaMark } from "./icons";

const nav = [
  { label: "Pricing", href: "#pricing" },
  { label: "Demo", href: "/demo" },
  { label: "Contact", href: "#contact" },
];

export async function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-white"
          aria-label="Dopa"
        >
          <DopaMark className="h-[18px] w-[18px]" />
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
                {item.hasMenu ? (
                  <ChevronDown className="h-3 w-3 opacity-50" />
                ) : null}
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

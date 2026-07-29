/**
 * Static homepage mock of the authenticated Brain desk —
 * scored climax (fixture CTR + cortical cue), not empty Operate.
 */

const NAV = [
  { label: "Business", icon: "gear" as const },
  { label: "Competitors", icon: "eye" as const },
  { label: "Products", icon: "box" as const },
  { label: "Keywords", icon: "tag" as const },
  { label: "Brain", icon: "brain" as const, active: true },
  { label: "Google Ads", icon: "google" as const },
];

const REGIONS = [
  {
    name: "V1 early visual",
    peak: "7.2s",
    score: 86,
    bar: "86%",
    description: "Strong early visual response at product reveal.",
  },
  {
    name: "FFA face / form",
    peak: "4.8s",
    score: 72,
    bar: "72%",
    description: "Form-selective response during fabric close-up.",
  },
  {
    name: "MT motion",
    peak: "2.1s",
    score: 64,
    bar: "64%",
    description: "Motion onset at hook.",
  },
  {
    name: "PPA place",
    peak: "9.5s",
    score: 41,
    bar: "41%",
    description: "Mild place response on street cutaway.",
  },
] as const;

export function HeroIssueDemo() {
  return (
    <div
      aria-hidden
      className="relative overflow-hidden rounded-xl border border-white/8 bg-[#08090a] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_80px_rgba(0,0,0,0.55)]"
    >
      <div className="dopa-grain pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative flex min-h-[34rem] flex-col md:min-h-[38rem] md:flex-row">
        {/* Sidebar */}
        <aside className="relative hidden w-48 shrink-0 flex-col border-r border-white/6 bg-[#08090a] md:flex">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(88,92,140,0.08),transparent_55%)]"
            aria-hidden
          />
          <div className="relative border-b border-white/6 px-3 py-3">
            <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
                N
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight text-white">
                Northstar Apparel
              </span>
              <ChevronDown />
            </div>
          </div>

          <nav className="relative flex flex-1 flex-col gap-0.5 px-2 py-3">
            {NAV.map((item) => (
              <div
                key={item.label}
                className={
                  item.active
                    ? "flex items-center gap-2.5 rounded-lg border border-brand/35 bg-brand/10 px-2.5 py-2 text-[12.5px] font-medium text-brand"
                    : "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-[#8a8f98]"
                }
              >
                <NavGlyph name={item.icon} />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </nav>

          <div className="relative border-t border-white/6 px-3 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-medium text-white">
                N
              </span>
              <span className="min-w-0 truncate text-[11px] text-[#8a8f98]">
                you@dopa.ai
              </span>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <div className="flex items-center gap-3 border-b border-white/6 px-4 py-2.5 sm:px-5">
            <p className="hidden shrink-0 text-[12px] text-[#8a8f98] sm:block">
              Northstar{" "}
              <span className="text-[#62666d]">/</span>{" "}
              <span className="text-white">Brain</span>
            </p>
            <div className="mx-auto flex w-full max-w-xs items-center gap-2 rounded-full border border-white/8 bg-white/3 px-3 py-1.5 text-[12px] text-[#62666d]">
              <SearchIcon />
              <span className="flex-1 truncate">Search or command…</span>
              <kbd className="hidden rounded border border-white/10 bg-white/4 px-1.5 py-px font-mono text-[10px] sm:inline">
                ⌘K
              </kbd>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-[12px] text-[#8a8f98]">Home</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-[10px] font-medium text-white">
                N
              </span>
            </div>
          </div>

          {/* Brain desk — scored climax */}
          <div className="flex-1 space-y-3 overflow-hidden p-4 sm:space-y-4 sm:p-5">
            <p className="max-w-2xl text-[13px] leading-5 text-[#8a8f98] sm:text-[14px] sm:leading-6">
              Predicted average CTR with TRIBE v2 cortical evidence — review
              before you spend.
            </p>

            {/* Neural desk bar */}
            <div className="dopa-panel flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#62666d] sm:text-[11px]">
                  Neural desk · live
                </p>
                <p className="mt-0.5 truncate text-[13px] font-medium text-white sm:text-[14px]">
                  Summit Tee — UGC hook.mp4
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="rounded-[5px] border border-brand/25 bg-brand/10 px-2 py-1 font-mono text-[10px] text-brand sm:text-[11px]">
                  CTR 2.84%
                </span>
                <span className="rounded-[5px] border border-white/10 px-2 py-1 text-[10px] text-[#8a8f98]">
                  4 regions
                </span>
                <span className="hidden rounded-[5px] border border-white/10 px-2 py-1 text-[10px] text-[#8a8f98] sm:inline">
                  12.0s clip
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] sm:px-3 sm:text-[12px]">
                  <BrainGlyph />
                  Re-run
                </span>
                <span className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-[#8a8f98] sm:px-3 sm:text-[12px]">
                  Replace
                </span>
              </div>
            </div>

            {/* Progress complete */}
            <div className="rounded-lg border border-white/8 bg-white/2 px-3.5 py-2.5 sm:py-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] font-medium text-[#8a8f98]">
                  Analysis complete
                </p>
                <p className="font-mono text-[9px] tabular-nums text-[#62666d]">
                  Upload · Inference · 3D model
                </p>
              </div>
              <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-white/6">
                <div className="h-full w-full rounded-full bg-brand/70" />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {["Upload", "Inference", "3D model"].map((label) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] text-brand/80"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* 60 / 40 desk */}
            <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(14rem,0.95fr)]">
              <div className="dopa-panel overflow-hidden">
                <div className="relative aspect-video overflow-hidden border-b border-white/6 bg-[#0c0d0e]">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "radial-gradient(ellipse at 35% 40%, rgba(94,106,210,0.28), transparent 55%), linear-gradient(135deg, #12131a 0%, #08090a 55%, #0e1018 100%)",
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
                    <p className="text-[12px] font-medium text-white">
                      Summit Tee — fabric reveal
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[#8a8f98]">
                      Peak attention · 7.2s
                    </p>
                  </div>
                  <span className="absolute left-3 top-3 rounded-[5px] border border-brand/30 bg-brand/15 px-2 py-1 font-mono text-[10px] text-brand">
                    Predicted CTR 2.84%
                  </span>
                </div>

                <div className="border-t border-white/6 px-3.5 py-3 sm:px-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#62666d]">
                      Peak response track
                    </p>
                    <p className="font-mono text-[10px] text-[#8a8f98]">
                      0s → 12.0s
                    </p>
                  </div>
                  <div className="relative h-8 overflow-hidden rounded-lg border border-white/8 bg-[#0c0d0e] sm:h-9">
                    <div
                      className="absolute inset-0 opacity-70"
                      style={{
                        backgroundImage:
                          "linear-gradient(90deg, transparent 0%, rgba(94,106,210,0.15) 18%, rgba(94,106,210,0.55) 60%, rgba(94,106,210,0.22) 82%, transparent 100%)",
                      }}
                    />
                    <div
                      className="absolute top-1 bottom-1 w-0.5 rounded-full bg-white/80"
                      style={{ left: "60%" }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {REGIONS.map((region) => (
                      <div
                        key={region.name}
                        className="rounded-lg border border-white/8 bg-white/2 px-3 py-2"
                      >
                        <p className="font-mono text-[9px] text-brand">
                          {region.peak} · {region.score}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] font-medium text-white">
                          {region.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="dopa-panel hidden overflow-hidden lg:block">
                <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#62666d]">
                      Brain sync
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#8a8f98]">
                      Average-subject cortical model
                    </p>
                  </div>
                  <span className="rounded-full border border-brand/25 bg-brand/10 px-2 py-1 text-[9px] font-medium text-brand">
                    TRIBE v2
                  </span>
                </div>

                <div className="relative flex aspect-5/4 flex-col items-center justify-center gap-2 overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,rgba(94,106,210,0.32),transparent_58%)] px-6 text-center">
                  <div
                    className="pointer-events-none absolute inset-[18%] rounded-[42%_58%_48%_52%] border border-brand/35 bg-brand/10 shadow-[inset_0_0_40px_rgba(94,106,210,0.35)]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute left-[28%] top-[34%] h-3 w-3 rounded-full bg-brand shadow-[0_0_18px_rgba(94,106,210,0.9)]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute right-[32%] top-[42%] h-2 w-2 rounded-full bg-accent/80 shadow-[0_0_12px_rgba(113,112,255,0.7)]"
                    aria-hidden
                  />
                  <p className="relative z-10 mt-auto mb-4 text-[11px] text-[#8a8f98]">
                    Cortical cue · V1 peak
                  </p>
                </div>

                <div className="border-t border-white/6 px-4 py-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#62666d]">
                    Dominant ROI
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="min-w-0 text-[16px] font-medium leading-tight tracking-[-0.02em] text-white">
                      V1 early visual
                    </p>
                    <span className="shrink-0 font-mono text-[24px] font-medium leading-none tracking-[-0.04em] text-white">
                      86
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-[#8a8f98]">
                    Strong early visual response at product reveal.
                  </p>
                </div>

                <div className="space-y-2.5 border-t border-white/6 px-4 py-3.5">
                  {REGIONS.slice(0, 3).map((region) => (
                    <div key={region.name}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="truncate text-[12px] text-[#8a8f98]">
                          {region.name}
                        </p>
                        <span className="shrink-0 font-mono text-[10px] text-white">
                          {(region.score / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/6">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: region.bar }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-[#8a8f98]"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.5 10.5 13.5 13.5" />
    </svg>
  );
}

function BrainGlyph() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.2 2.8c-1.5.1-2.7 1.4-2.7 3 0 .5.1 1 .4 1.4A2.4 2.4 0 0 0 2.5 9.4c0 1.3 1 2.4 2.3 2.5v1.3c0 .4.3.7.7.7h.8c.4 0 .7-.3.7-.7v-.7h.8v.7c0 .4.3.7.7.7h.8c.4 0 .7-.3.7-.7v-1.3c1.3-.1 2.3-1.2 2.3-2.5 0-1-.6-1.8-1.4-2.2.3-.4.4-.9.4-1.4 0-1.6-1.2-2.9-2.7-3-.5-.8-1.4-1.3-2.4-1.3S6.7 2 6.2 2.8Z" />
    </svg>
  );
}

function NavGlyph({
  name,
}: {
  name: "gear" | "eye" | "box" | "tag" | "brain" | "google";
}) {
  const className = "h-3.5 w-3.5 shrink-0";
  switch (name) {
    case "gear":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="2.2" />
          <path d="M8 1.8v1.4M8 12.8v1.4M1.8 8h1.4M12.8 8h1.4M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" strokeLinecap="round" />
        </svg>
      );
    case "eye":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M1.8 8s2.2-3.5 6.2-3.5S14.2 8 14.2 8s-2.2 3.5-6.2 3.5S1.8 8 1.8 8Z" />
          <circle cx="8" cy="8" r="1.6" />
        </svg>
      );
    case "box":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M2.5 5.2 8 2.5l5.5 2.7v5.6L8 13.5 2.5 10.8V5.2Z" />
          <path d="M2.5 5.2 8 8l5.5-2.8M8 8v5.5" />
        </svg>
      );
    case "tag":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M2.5 8.8V3.5H7.8l5.7 5.7-4.3 4.3L2.5 8.8Z" />
          <circle cx="5.5" cy="5.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "brain":
      return <BrainGlyph />;
    case "google":
      return (
        <svg className={className} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.2 7.3v1.7h3.1c-.1.8-.6 2-1.8 2.7l1.5 1.2c1.5-1.4 2.2-3.4 2.2-5.7 0-.5 0-.9-.1-1.2H8.2v1.3Z" opacity=".9" />
          <path d="M4.6 9.5a4.4 4.4 0 0 1 0-3l-1.5-1.2a6.5 6.5 0 0 0 0 5.4l1.5-1.2Z" opacity=".7" />
          <path d="M8.2 3.4c.9 0 1.7.3 2.3.9l1.3-1.3A5.3 5.3 0 0 0 3.1 5.3l1.5 1.2c.4-1.2 1.7-3.1 3.6-3.1Z" opacity=".8" />
          <path d="M8.2 12.6c1.8 0 3.3-.6 4.3-1.7l-1.5-1.2c-.5.4-1.3.9-2.8.9-1.9 0-3.2-1.9-3.6-3.1l-1.5 1.2A5.4 5.4 0 0 0 8.2 12.6Z" />
        </svg>
      );
  }
}

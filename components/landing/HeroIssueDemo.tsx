/**
 * Static homepage mock of the authenticated Brain desk —
 * mirrors DashboardShell + BrainTab empty state, not a live workspace.
 */

const NAV = [
  { label: "Business", icon: "gear" as const },
  { label: "Competitors", icon: "eye" as const },
  { label: "Products", icon: "box" as const },
  { label: "Keywords", icon: "tag" as const },
  { label: "Brain", icon: "brain" as const, active: true },
  { label: "Google Ads", icon: "google" as const },
];

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
                D
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight text-white">
                Workspace
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
          <header className="flex items-center gap-3 border-b border-white/6 px-4 py-2.5 sm:px-5">
            <p className="hidden shrink-0 text-[12px] text-[#8a8f98] sm:block">
              Workspace{" "}
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
          </header>

          {/* Brain desk */}
          <div className="flex-1 space-y-3 overflow-hidden p-4 sm:space-y-4 sm:p-5">
            <p className="max-w-2xl text-[13px] leading-5 text-[#8a8f98] sm:text-[14px] sm:leading-6">
              Upload an ad to predict its average click-through rate and see the
              cortical response TRIBE v2 models for the clip.
            </p>

            {/* Neural desk bar */}
            <div className="dopa-panel flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#62666d] sm:text-[11px]">
                  Neural desk · ready
                </p>
                <p className="mt-0.5 truncate text-[13px] font-medium text-white sm:text-[14px]">
                  No creative selected
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="rounded-[5px] border border-brand/25 bg-brand/10 px-2 py-1 font-mono text-[10px] text-brand sm:text-[11px]">
                  CTR —
                </span>
                <span className="rounded-[5px] border border-white/10 px-2 py-1 text-[10px] text-[#62666d]">
                  0 regions
                </span>
                <span className="hidden rounded-[5px] border border-white/10 px-2 py-1 text-[10px] text-[#62666d] sm:inline">
                  — clip
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] sm:px-3 sm:text-[12px]">
                  <BrainGlyph />
                  Analyze
                </span>
                <span className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-[#8a8f98] sm:px-3 sm:text-[12px]">
                  Upload
                </span>
              </div>
            </div>

            {/* Progress idle */}
            <div className="rounded-lg border border-white/8 bg-white/2 px-3.5 py-2.5 sm:py-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] font-medium text-[#62666d]">
                  Waiting for creative
                </p>
                <p className="font-mono text-[9px] tabular-nums text-[#62666d]">
                  Upload · Inference · 3D model
                </p>
              </div>
              <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-white/6">
                <div className="h-full w-0 rounded-full bg-brand/40" />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {["Upload", "Inference", "3D model"].map((label) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] text-white/25"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* 60 / 40 desk */}
            <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(14rem,0.95fr)]">
              <div className="dopa-panel overflow-hidden">
                <div className="relative flex aspect-video flex-col items-center justify-center gap-2.5 border-b border-dashed border-transparent bg-[#08090a] px-6 text-center sm:gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-[#62666d] sm:h-12 sm:w-12">
                    <UploadGlyph />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white sm:text-[14px]">
                      Choose an ad video
                    </p>
                    <p className="mt-1 text-[11px] text-[#8a8f98] sm:text-[12px]">
                      MP4 or MOV · up to 60 seconds · 250 MB maximum
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/6 px-3.5 py-3 sm:px-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#62666d]">
                      Peak response track · awaiting
                    </p>
                    <p className="font-mono text-[10px] text-[#62666d]">
                      0s → 30.0s
                    </p>
                  </div>
                  <div className="relative h-8 overflow-hidden rounded-lg border border-white/8 bg-[#0c0d0e] sm:h-9">
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        backgroundImage:
                          "linear-gradient(90deg, transparent 0%, rgba(94,106,210,0.18) 50%, transparent 100%)",
                      }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-white/8 bg-white/2 px-3 py-2"
                      >
                        <p className="font-mono text-[9px] text-brand">— · —</p>
                        <p className="mt-0.5 truncate text-[12px] font-medium text-[#62666d]">
                          Region pending
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

                <div className="flex aspect-5/4 flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_50%_45%,rgba(94,106,210,0.18),transparent_58%)] px-6 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-[#62666d]">
                    <BrainGlyph />
                  </span>
                  <p className="text-[12px] text-[#8a8f98]">
                    Cortex appears after analysis
                  </p>
                </div>

                <div className="border-t border-white/6 px-4 py-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#62666d]">
                    Dominant ROI
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="min-w-0 text-[16px] font-medium leading-tight tracking-[-0.02em] text-[#62666d]">
                      Awaiting response
                    </p>
                    <span className="shrink-0 font-mono text-[24px] font-medium leading-none tracking-[-0.04em] text-white">
                      —
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-[#8a8f98]">
                    The strongest modeled cortical region will land here.
                  </p>
                </div>

                <div className="space-y-2.5 border-t border-white/6 px-4 py-3.5">
                  {[1, 2, 3].map((n) => (
                    <div key={n}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="truncate text-[12px] text-[#62666d]">
                          Region {n}
                        </p>
                        <span className="shrink-0 font-mono text-[10px] text-[#62666d]">
                          0.00
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/6">
                        <div className="h-full w-0 rounded-full bg-brand" />
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

function UploadGlyph() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V5" />
      <path d="m8 9 4-4 4 4" />
      <path d="M5 19h14" />
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

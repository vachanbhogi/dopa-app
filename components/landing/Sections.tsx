import { LandingBrainViewer } from "./LandingBrainViewer";
import { ArrowRight } from "./icons";

const pillars = [
  {
    id: "tribe",
    title: "TRIBE v2 brain",
    body: "Meta’s neural encoder predicts an average-subject cortical response to your ad’s video frames.",
    fig: "FIG 0.2",
  },
  {
    id: "metric",
    title: "Metric prediction",
    body: "dopa-model maps those cortical features to one predicted average click-through rate.",
    fig: "FIG 0.3",
  },
  {
    id: "context",
    title: "Campaign context",
    body: "Keep products, AI-assisted competitor research, keyword ideas, and Google Ads ops in one workspace.",
    fig: "FIG 0.4",
  },
] as const;

function PillarFig({ id }: { id: (typeof pillars)[number]["id"] }) {
  if (id === "tribe") {
    return (
      <div className="absolute inset-6 flex flex-col rounded-lg border border-white/8 bg-[#0f1011]/90 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] text-tertiary">Cortical response</span>
          <span className="font-mono text-[10px] text-accent">7.2s peak</span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-white/6 bg-[#0b0c0d]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_40%,rgba(113,112,255,0.45),transparent_55%)]" />
          <div className="absolute inset-0 opacity-30 dopa-grain" />
          <div className="absolute bottom-2 left-2 right-2 flex h-8 items-end gap-0.5">
            {[28, 44, 38, 62, 88, 54, 36].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-brand/55"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (id === "metric") {
    return (
      <div className="absolute inset-6 flex flex-col justify-between rounded-lg border border-white/8 bg-[#0f1011]/90 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-tertiary">dopa-model</span>
          <span className="rounded-full border border-brand/35 bg-brand/15 px-2 py-0.5 font-mono text-[10px] text-accent">
            CTR
          </span>
        </div>
        <div>
          <div className="font-mono text-[28px] font-medium leading-none tracking-[-0.04em] text-foreground">
            2.84%
          </div>
          <div className="mt-1 text-[11px] text-secondary">
            Predicted average click-through
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { l: "Hook", v: "↑" },
            { l: "Product", v: "↑" },
            { l: "CTA", v: "→" },
          ].map((m) => (
            <div
              key={m.l}
              className="rounded border border-white/6 bg-white/3 px-1.5 py-1 text-center"
            >
              <div className="text-[9px] text-tertiary">{m.l}</div>
              <div className="font-mono text-[11px] text-foreground">{m.v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-6 flex flex-col rounded-lg border border-white/8 bg-[#0f1011]/90 p-3">
      <div className="mb-2 text-[10px] text-tertiary">Workspace</div>
      <div className="space-y-1.5">
        {[
          { label: "Business", meta: "Imported" },
          { label: "Competitors", meta: "3 tracked" },
          { label: "Keywords", meta: "Intent" },
          { label: "Google Ads", meta: "Live" },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-md border border-white/6 bg-white/3 px-2 py-1.5"
          >
            <span className="text-[11px] text-foreground">{row.label}</span>
            <span className="font-mono text-[10px] text-tertiary">{row.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Species() {
  return (
    <section id="pipeline" className="scroll-mt-16 border-t border-white/6">
      <div className="mx-auto max-w-300 px-5 py-24 md:px-8 md:py-32">
        <h2 className="mx-auto max-w-205 text-center text-[28px] font-medium leading-[1.2] tracking-[-0.03em] text-foreground md:text-[40px]">
          A new species of campaign tool. Purpose-built for marketing teams with AI
          workflows at its core, Dopa predicts average CTR from modeled cortical
          response — then puts the evidence in context.
        </h2>

        <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-3 md:gap-8">
          {pillars.map((p) => (
            <div key={p.id} className="group">
              <div className="dopa-panel relative mb-5 aspect-4/3 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(94,106,210,0.18),transparent_55%)]" />
                <div className="absolute inset-0 opacity-40 dopa-grain" />
                <div className="absolute bottom-3 left-3 z-10 rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-tertiary">
                  {p.fig}
                </div>
                <PillarFig id={p.id} />
              </div>
              <h3 className="text-[17px] font-medium tracking-[-0.01em]">{p.title}</h3>
              <p className="mt-2 text-[14px] leading-6 text-secondary">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionLink({
  index,
  label,
}: {
  index: string;
  label: string;
}) {
  return (
    <a
      href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
      className="inline-flex items-center gap-2 text-[14px] text-foreground transition-opacity hover:opacity-80"
    >
      <span className="font-mono text-[12px] text-tertiary">{index}</span>
      <span className="font-medium">{label}</span>
      <ArrowRight className="opacity-50" />
    </a>
  );
}

function FeatureLinks({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  return (
    <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-1.5 text-[13px] text-secondary"
        >
          <span className="font-mono text-[11px] text-tertiary">{item.id}</span>
          {item.label}
          <span className="text-tertiary">+</span>
        </span>
      ))}
    </div>
  );
}

function Chip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={
        active
          ? "rounded-md border border-brand/40 bg-brand/15 px-2.5 py-1 text-[11px] font-medium text-accent"
          : "rounded-md border border-white/8 bg-white/3 px-2.5 py-1 text-[11px] text-secondary"
      }
    >
      {label}
    </span>
  );
}

export function Business() {
  return (
    <section id="business" className="border-t border-white/6">
      <div className="mx-auto max-w-300 px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-160">
          <SectionLink index="1.0" label="Business" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Extract brand intent and audience personas in 30 seconds
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Paste your website — Dopa auto-imports brand highlights, target
            audience, voice, and price positioning so every score starts from
            the right brief.
          </p>
        </div>

        <div className="dopa-panel mt-12 overflow-hidden p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2.5">
            <span className="text-[11px] text-tertiary">Import from</span>
            <span className="font-mono text-[12px] text-foreground">
              https://northstar.example
            </span>
            <span className="ml-auto rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
              Auto-imported
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-white/6 pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-[13px] font-bold text-white">
              N
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-foreground">
                Northstar Apparel
              </div>
              <div className="text-[12px] text-tertiary">
                northstar.example · DTC apparel
              </div>
            </div>
            <span className="ml-auto rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] text-accent">
              From website
            </span>
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <div>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-tertiary">
                Target audience
              </div>
              <p className="text-[13px] leading-5 text-secondary">
                25–40 urban professionals who buy elevated basics and respond to
                founder-led UGC.
              </p>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-tertiary">
                Brand voice
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip label="Confident" active />
                <Chip label="Warm" />
                <Chip label="Minimal" active />
                <Chip label="Playful" />
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-tertiary">
                Price positioning
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip label="Value" />
                <Chip label="Mid-market" active />
                <Chip label="Premium" />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-white/6 bg-white/2 p-4">
            <div className="mb-3 text-[11px] text-tertiary">Brand defaults</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip label="Industry · Apparel" active />
              <Chip label="Goal · Prospecting" active />
              <Chip label="Tone · Confident" active />
              <Chip label="Range · $48–$120" />
            </div>
          </div>
        </div>

        <FeatureLinks
          items={[
            { id: "1.1", label: "Website import" },
            { id: "1.2", label: "Audience personas" },
            { id: "1.3", label: "Voice chips" },
            { id: "1.4", label: "Price positioning" },
          ]}
        />
      </div>
    </section>
  );
}

export function Competitors() {
  const cards = [
    {
      name: "Rival Labs",
      domain: "rivallabs.com",
      threat: 86,
      hook: "Price-slash montage · soft CTA",
      counter: "Lead with fabric proof, not discount",
      confidence: "92%",
      horizon: "Now",
    },
    {
      name: "Atlas Wear",
      domain: "atlaswear.co",
      threat: 71,
      hook: "Founder unbox · 6s punch-in",
      counter: "Match pace; own the tactile close-up",
      confidence: "78%",
      horizon: "6 mo",
    },
    {
      name: "Cove Supply",
      domain: "covesupply.com",
      threat: 58,
      hook: "Lifestyle montage · muted VO",
      counter: "Counter with sharper product focus",
      confidence: "64%",
      horizon: "12 mo",
    },
  ];

  return (
    <section id="competitors" className="border-t border-white/6">
      <div className="mx-auto max-w-300 px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-160">
          <SectionLink index="2.0" label="Competitors" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Monitor competitor ad angles and creative hooks
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Watchlist cards with hook teardowns, threat scores, and
            counter-positioning angles — evidence before you react.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <article key={c.name} className="dopa-panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-medium text-white">
                    {c.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-tertiary">{c.domain}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[22px] font-medium leading-none text-foreground">
                    {c.threat}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-tertiary">
                    threat
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-white/6 bg-black/15 p-3">
                <div>
                  <p className="text-[10px] text-tertiary">Confidence</p>
                  <p className="mt-0.5 font-mono text-[13px] text-foreground">
                    {c.confidence}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-tertiary">Horizon</p>
                  <p className="mt-0.5 text-[13px] text-foreground">{c.horizon}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-[12px] leading-5">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-tertiary">
                    Ad hook
                  </p>
                  <p className="mt-1 text-secondary">{c.hook}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-tertiary">
                    Counter-angle
                  </p>
                  <p className="mt-1 text-secondary">{c.counter}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <FeatureLinks
          items={[
            { id: "2.1", label: "Watchlist" },
            { id: "2.2", label: "Hook teardown" },
            { id: "2.3", label: "Threat scores" },
            { id: "2.4", label: "Counter-angles" },
          ]}
        />
      </div>
    </section>
  );
}

export function Products() {
  const products = [
    {
      name: "Summit Tee",
      price: "$58",
      category: "Apparel",
      value: "Heavyweight cotton · boxy fit",
      hooks: ["Fabric close-up", "Fit flip", "Street cutaway"],
    },
    {
      name: "Trail Overshirt",
      price: "$128",
      category: "Outerwear",
      value: "Waxed canvas · seasonless layer",
      hooks: ["Weather test", "Layer stack", "Detail macro"],
    },
    {
      name: "Core Sock 3-Pack",
      price: "$32",
      category: "Accessories",
      value: "Merino blend · everyday rotation",
      hooks: ["Unpack ASMR", "Color grid", "Wear day 7"],
    },
  ];

  return (
    <section id="products" className="border-t border-white/6">
      <div className="mx-auto max-w-300 px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-160">
          <SectionLink index="3.0" label="Products" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Organize product offers and visual creative hooks
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Active offer cards that link value props, price points, and visual
            storyboard hooks in one catalog.
          </p>
        </div>

        <div className="dopa-panel mt-12 overflow-hidden">
          <div className="grid grid-cols-[1fr_72px_100px] gap-3 border-b border-white/6 px-4 py-2.5 text-[11px] text-tertiary md:grid-cols-[1.2fr_80px_120px_1fr]">
            <span>Product</span>
            <span>Price</span>
            <span className="hidden md:inline">Category</span>
            <span className="text-right md:text-left">Hooks</span>
          </div>
          {products.map((p) => (
            <div
              key={p.name}
              className="grid grid-cols-[1fr_72px_100px] gap-3 border-b border-white/6 px-4 py-3.5 last:border-0 md:grid-cols-[1.2fr_80px_120px_1fr]"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-foreground">
                  {p.name}
                </div>
                <div className="mt-0.5 truncate text-[12px] text-secondary">
                  {p.value}
                </div>
              </div>
              <div className="font-mono text-[13px] text-foreground">{p.price}</div>
              <div className="hidden text-[12px] text-secondary md:block">
                {p.category}
              </div>
              <div className="col-span-3 flex flex-wrap justify-end gap-1 md:col-span-1 md:justify-start">
                {p.hooks.map((h) => (
                  <span
                    key={h}
                    className="rounded bg-white/6 px-1.5 py-0.5 text-[10px] text-secondary"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <FeatureLinks
          items={[
            { id: "3.1", label: "Offer catalog" },
            { id: "3.2", label: "Value props" },
            { id: "3.3", label: "Price points" },
            { id: "3.4", label: "Storyboard hooks" },
          ]}
        />
      </div>
    </section>
  );
}

export function Keywords() {
  const rows = [
    { q: "heavyweight tee men", vol: "14.8k", cpc: "$1.40", ctr: "3.1%" },
    { q: "boxy fit t-shirt", vol: "9.2k", cpc: "$1.15", ctr: "2.8%" },
    { q: "organic cotton basics", vol: "6.4k", cpc: "$0.95", ctr: "2.4%" },
    { q: "premium everyday tee", vol: "4.1k", cpc: "$1.70", ctr: "3.4%" },
    { q: "founder brand apparel", vol: "2.7k", cpc: "$1.25", ctr: "2.9%" },
  ];

  return (
    <section id="keywords" className="border-t border-white/6">
      <div className="mx-auto max-w-300 px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-160">
          <SectionLink index="4.0" label="Keywords" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Align visual creatives with high-intent audience queries
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            A search intent matrix that matches buyer queries with predicted ad
            CTR — so hooks and headlines share the same language.
          </p>
        </div>

        <div className="dopa-panel mt-12 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/6 px-4 py-3">
            <Chip label="Brand" />
            <Chip label="Product" active />
            <span className="ml-auto text-[11px] text-tertiary">
              Scope · Summit Tee
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/6 text-[11px] text-tertiary">
                  <th className="px-4 py-2.5 font-medium">Query</th>
                  <th className="px-4 py-2.5 font-medium">Volume</th>
                  <th className="px-4 py-2.5 font-medium">CPC</th>
                  <th className="px-4 py-2.5 font-medium">Pred. CTR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.q} className="border-b border-white/6 last:border-0">
                    <td className="px-4 py-3 text-foreground">{r.q}</td>
                    <td className="px-4 py-3 font-mono text-secondary">{r.vol}</td>
                    <td className="px-4 py-3 font-mono text-secondary">{r.cpc}</td>
                    <td className="px-4 py-3 font-mono text-accent">{r.ctr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <FeatureLinks
          items={[
            { id: "4.1", label: "Intent matrix" },
            { id: "4.2", label: "Buyer queries" },
            { id: "4.3", label: "Predicted CTR" },
            { id: "4.4", label: "Headline align" },
          ]}
        />
      </div>
    </section>
  );
}

export function Brain() {
  return (
    <section id="brain" className="border-t border-white/6">
      <div className="mx-auto max-w-300 px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-160">
          <SectionLink index="5.0" label="Brain" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Predict CTR from human fMRI cortical visual response
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Frame-by-frame cortical heatmap timeline, parcel activation preview,
            and dopa-model CTR scorecard — the core review surface.
          </p>
        </div>

        <div className="dopa-panel mt-12 overflow-hidden p-4 md:p-6">
          <LandingBrainViewer />
        </div>

        <FeatureLinks
          items={[
            { id: "5.1", label: "Cortical heatmap" },
            { id: "5.2", label: "fMRI visual encoding" },
            { id: "5.3", label: "Hemodynamic lag" },
            { id: "5.4", label: "Predicted CTR" },
          ]}
        />
      </div>
    </section>
  );
}

export function GoogleAds() {
  const metrics = [
    { label: "Spend", value: "$12.4k" },
    { label: "Conversions", value: "384" },
    { label: "ROAS", value: "3.2x" },
    { label: "Live CTR", value: "2.61%" },
  ];

  return (
    <section id="google-ads" className="border-t border-white/6">
      <div className="mx-auto max-w-300 px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-160">
          <SectionLink index="6.0" label="Google Ads" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Automate campaign deployment and closed-loop auto-pause
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Live Ads sync, predicted vs live CTR comparison, and auto-pause rule
            alerts — close the loop after you ship.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-4 py-2.5 text-[12px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-medium text-emerald-300">Connected</span>
            <span className="text-secondary">
              Google Ads · Northstar · last sync 2m ago
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="dopa-panel px-4 py-3.5">
                <div className="text-[11px] text-tertiary">{m.label}</div>
                <div className="mt-1 font-mono text-[20px] text-foreground">
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          <div className="dopa-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/6 px-4 py-3">
              <span className="text-[13px] font-medium text-foreground">
                Summer Drop · Prospecting
              </span>
              <div className="flex items-center gap-3 text-[12px]">
                <span className="text-secondary">
                  Pred. <span className="font-mono text-accent">2.84%</span>
                </span>
                <span className="text-tertiary">vs</span>
                <span className="text-secondary">
                  Live <span className="font-mono text-foreground">2.61%</span>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-3 px-4 py-4">
              <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-300">
                Auto-pause rule
              </span>
              <p className="max-w-140 text-[13px] leading-5 text-secondary">
                Soft-CTA variant trails predicted CTR by &gt;15% over 48h —
                queued for pause review.
              </p>
            </div>
          </div>
        </div>

        <FeatureLinks
          items={[
            { id: "6.1", label: "Ads sync" },
            { id: "6.2", label: "Pred vs live" },
            { id: "6.3", label: "Auto-pause" },
            { id: "6.4", label: "ROAS board" },
          ]}
        />
      </div>
    </section>
  );
}

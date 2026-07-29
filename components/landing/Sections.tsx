import { ArrowRight } from "./icons";

const pillars = [
  {
    title: "TRIBE v2 brain",
    body: "Meta’s neural encoder predicts an average-subject cortical response to your ad’s video frames.",
    fig: "FIG 0.2",
  },
  {
    title: "Metric prediction",
    body: "dopa-model maps those cortical features to one predicted average click-through rate.",
    fig: "FIG 0.3",
  },
  {
    title: "Agentic campaigns",
    body: "Agents triage creatives, scrape competitors, and replace slow live A/B loops.",
    fig: "FIG 0.4",
  },
];

export function Species() {
  return (
    <section className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-32">
        <h2 className="mx-auto max-w-[820px] text-center text-[28px] font-medium leading-[1.2] tracking-[-0.03em] text-foreground md:text-[40px]">
          A new species of campaign tool. Purpose-built for marketing teams with AI
          workflows at its core, Dopa predicts average CTR from modeled cortical
          response — then puts the evidence in context.
        </h2>

        <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-3 md:gap-8">
          {pillars.map((p) => (
            <div key={p.title} className="group">
              <div className="dopa-panel relative mb-5 aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(94,106,210,0.18),transparent_55%)]" />
                <div className="absolute inset-0 opacity-40 dopa-grain" />
                <div className="absolute bottom-3 left-3 rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-tertiary">
                  {p.fig}
                </div>
                <div className="absolute inset-6 rounded-lg border border-white/[0.08] bg-[#0f1011]/80 p-3">
                  <div className="mb-2 h-2 w-16 rounded bg-white/10" />
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded bg-white/[0.06]" />
                    <div className="h-2 w-[85%] rounded bg-white/[0.06]" />
                    <div className="h-2 w-[70%] rounded bg-white/[0.06]" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-6 flex-1 rounded bg-brand/30" />
                    <div className="h-6 w-10 rounded bg-white/[0.06]" />
                  </div>
                </div>
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
        <a
          key={item.id}
          href={`#${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-secondary transition-colors hover:text-foreground"
        >
          <span className="font-mono text-[11px] text-tertiary">{item.id}</span>
          {item.label}
          <span className="text-tertiary">+</span>
        </a>
      ))}
    </div>
  );
}

export function Intake() {
  const columns = [
    {
      title: "Backlog",
      count: 8,
      issues: [
        "Score UGC unbox vs studio walkthrough",
        "Scrape Rival Labs summer hooks",
        "Compare predicted CTR before spend",
        "Review highest-scoring creatives",
      ],
    },
    {
      title: "Todo",
      count: 71,
      issues: [
        { title: "Kill soft-CTA variant", tags: ["A/B", "Pause"] },
        { title: "TRIBE encode batch · 12 cuts", tags: ["Brain"] },
        { title: "Competitor price-slash montage", tags: ["Research"] },
        {
          title: "Strongest cortical response at 7s",
          tags: ["Response"],
        },
      ],
    },
    {
      title: "In Progress",
      count: 3,
      issues: [
        { title: "Predict average CTR for founder cut", id: "AD-1881" },
        { title: "Launch Summer Drop flight", tags: ["Campaign"], id: "MKT-1028" },
        { title: "Replace live A/B with brain delta", tags: ["A/B"], id: "AD-2010" },
      ],
    },
    {
      title: "Done",
      count: 53,
      issues: [
        {
          title: "Reviewed Studio walkthrough score",
          tags: ["Review"],
          id: "AD-1755",
        },
        { title: "Compared unbox hook score", id: "AD-1942" },
        { title: "Competitor scrape · 3 brands", id: "RES-012" },
        {
          title: "Published cortical response report",
          tags: ["Report"],
          id: "AD-1660",
        },
      ],
    },
  ];

  return (
    <section id="intake" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-[640px]">
          <SectionLink index="1.0" label="Intake" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Make campaign operations self-driving
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Turn creative uploads and competitor signals into scored actions that are
            routed, labeled, and prioritized for your media team.
          </p>
        </div>

        <div className="dopa-panel mt-12 overflow-hidden p-3 md:p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title} className="rounded-lg bg-white/[0.02] p-3">
                <div className="mb-3 flex items-center justify-between text-[12px]">
                  <span className="font-medium text-foreground">{col.title}</span>
                  <span className="text-tertiary">{col.count}</span>
                </div>
                <div className="space-y-2">
                  {col.issues.map((issue) => {
                    const title = typeof issue === "string" ? issue : issue.title;
                    const tags = typeof issue === "string" ? [] : issue.tags ?? [];
                    const id = typeof issue === "string" ? undefined : "id" in issue ? issue.id : undefined;
                    return (
                      <div
                        key={title}
                        className="rounded-md border border-white/[0.06] bg-[#0f1011] px-2.5 py-2"
                      >
                        <div className="text-[12px] leading-4 text-foreground">{title}</div>
                        {(tags.length > 0 || id) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {id ? (
                              <span className="font-mono text-[10px] text-tertiary">{id}</span>
                            ) : null}
                            {tags.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-white/[0.06] px-1 py-0.5 text-[10px] text-secondary"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-white/[0.06] bg-[#0b0c0d] p-4">
            <div className="mb-3 text-[11px] text-tertiary">Thread in #feedback</div>
            <div className="space-y-3 text-[13px] leading-5">
              <Slack name="maya" text="Has anyone scored the new unbox cut against Rival Labs?" />
              <Slack name="lena" text="Live A/B is burning budget on the soft CTA — can we pretest?" />
              <Slack name="maya" text="Yea, we should run TRIBE v2 and compare predicted average CTR before spend..." />
              <Slack name="alex" text="Let’s review the CTR estimates beside the modeled cortical response." />
              <div className="rounded-md border border-dashed border-white/[0.1] bg-white/[0.02] px-3 py-2 text-secondary">
                <span className="text-accent">@Dopa</span> score these cuts, pause weak ones, and
                assign winners to me
              </div>
            </div>
          </div>
        </div>

        <FeatureLinks
          items={[
            { id: "1.1", label: "Dopa Agent" },
            { id: "1.2", label: "Creative triage" },
            { id: "1.3", label: "Competitor scrape" },
            { id: "1.4", label: "A/B replace" },
          ]}
        />
      </div>
    </section>
  );
}

function Slack({ name, text }: { name: string; text: string }) {
  return (
    <div>
      <span className="font-medium text-foreground">{name}</span>{" "}
      <span className="text-secondary">{text}</span>
    </div>
  );
}

export function Plan() {
  const months = ["FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP"];
  const initiatives = [
    { name: "Always-on prospecting", count: 99 },
    { name: "Retargeting", count: 28 },
    { name: "UGC pipeline", count: 16 },
    { name: "Brand films", count: 8 },
    { name: "APAC flights", count: 21 },
    { name: "Launch week", count: 12 },
    { name: "Competitor responses", count: 9 },
  ];

  return (
    <section id="plan" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-[640px]">
          <SectionLink index="2.0" label="Plan" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Define the campaign direction
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Plan flights from creative idea to spend. Align your team on predicted
            creative options, roadmaps, and clear briefs grounded in predicted
            CTR and cortical-response evidence.
          </p>
        </div>

        <div className="dopa-panel mt-12 overflow-x-auto p-4 md:p-6">
          <div className="mb-4 grid min-w-[720px] grid-cols-8 gap-2 text-center text-[11px] text-tertiary">
            {months.map((m) => (
              <div key={m}>{m}</div>
            ))}
          </div>
          <div className="relative min-w-[720px] space-y-3">
            <RoadBar label="Summer Drop" from={1} span={3} tone="brand" sub="Unbox · UGC · CTA tests" />
            <RoadBar label="Competitor watch" from={3} span={3} tone="green" sub="Scrape · Score · Alert" />
            <RoadBar label="A/B replacement" from={5} span={3} tone="amber" sub="Brain delta · Ship" />
          </div>
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {initiatives.map((i) => (
              <div
                key={i.name}
                className="flex items-center justify-between rounded-md border border-white/[0.06] px-3 py-2 text-[13px]"
              >
                <span>{i.name}</span>
                <span className="text-tertiary">{i.count}</span>
              </div>
            ))}
          </div>
        </div>

        <FeatureLinks
          items={[
            { id: "2.1", label: "Flights" },
            { id: "2.2", label: "Briefs" },
            { id: "2.3", label: "Campaigns" },
            { id: "2.4", label: "Scoreboards" },
          ]}
        />
      </div>
    </section>
  );
}

function RoadBar({
  label,
  from,
  span,
  tone,
  sub,
}: {
  label: string;
  from: number;
  span: number;
  tone: "brand" | "green" | "amber";
  sub: string;
}) {
  const colors = {
    brand: "bg-brand/35 border-brand/40",
    green: "bg-emerald-500/25 border-emerald-500/35",
    amber: "bg-amber-400/25 border-amber-400/35",
  };
  return (
    <div className="grid grid-cols-8 gap-2">
      <div
        className={`rounded-md border px-3 py-2 ${colors[tone]}`}
        style={{ gridColumn: `${from} / span ${span}` }}
      >
        <div className="text-[12px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] text-secondary">{sub}</div>
      </div>
    </div>
  );
}

export function Build() {
  const agents = ["Dopa", "Triage", "Research", "TRIBE encode", "Metric head", "Maya"];

  return (
    <section id="build" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-[640px]">
          <SectionLink index="3.0" label="Build" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Move campaigns forward across teams and agents
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Deploy agents that score creatives with TRIBE v2, predict average
            CTR, and manage flights end-to-end — or work alongside your team.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="dopa-panel overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] text-secondary">
              Dopa · Agent
            </div>
            <div className="space-y-3 p-4 font-mono text-[12px] leading-5 text-secondary">
              <p className="text-foreground">On it! I&apos;ve received your request.</p>
              <p>Kicked off TRIBE v2 encode on summer-drop/unbox.mp4</p>
              <p>Extracting brain_video cortical response</p>
              <p className="text-tertiary">
                dopa-model$ predict --target mean_ctr
              </p>
              <p className="text-emerald-400">
                Predicted average CTR 2.84%
              </p>
              <p>Ranking the five most responsive cortical parcels</p>
              <p className="text-tertiary">Thought for 5s</p>
            </div>
          </div>
          <div className="dopa-panel p-4">
            <div className="mb-3 text-[12px] text-secondary">Agents Command Menu</div>
            <div className="mb-4 rounded-md border border-white/[0.08] bg-black/30 px-3 py-2 text-[13px] text-tertiary">
              No results found.
            </div>
            <div className="space-y-1">
              {agents.map((a, i) => (
                <div
                  key={a}
                  className={`flex items-center justify-between rounded-md px-2 py-2 text-[13px] ${
                    i === 0 ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span>{a}</span>
                  {["Dopa", "TRIBE encode", "Metric head"].includes(a) ? (
                    <span className="rounded bg-brand/25 px-1.5 py-0.5 text-[10px] text-accent">
                      Agent
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <FeatureLinks
          items={[
            { id: "3.1", label: "Creatives" },
            { id: "3.2", label: "Agents" },
            { id: "3.3", label: "TRIBE v2" },
            { id: "3.4", label: "CTR model" },
            { id: "3.5", label: "Flights" },
          ]}
        />
      </div>
    </section>
  );
}

const beforeCode = `// live A/B — wait weeks for spend signal
shipVariant("soft_cta")
await splitTest({ budget: 5000 })
// live CTR arrives after spend`;

const afterCode = `// Dopa — one pre-spend model estimate
const result = await dopa.analyze(ad)
review(result.predictedAverageCtr)
inspect(result.corticalResponse)`;

export function Diffs() {
  return (
    <section id="diffs" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-[640px]">
          <SectionLink index="4.0" label="Diffs" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Review creatives and agent output
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Compare live CTR with Dopa’s predicted average CTR at a glance.
            Review the modeled cortical response, discuss, and decide — all
            within Dopa.
          </p>
        </div>

        <div className="dopa-panel mt-12 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-[12px] text-secondary">
            <span className="text-foreground">Dopa</span>
            <span className="text-tertiary">·</span>
            <span className="font-mono">campaigns/summer-drop/unbox.mp4</span>
          </div>
          <div className="grid md:grid-cols-2">
            <pre className="overflow-x-auto border-b border-white/[0.06] p-4 font-mono text-[11px] leading-5 text-red-300/80 md:border-b-0 md:border-r">
              {beforeCode}
            </pre>
            <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-5 text-emerald-300/90">
              {afterCode}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Monitor() {
  return (
    <section id="monitor" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-[640px]">
          <SectionLink index="5.0" label="Monitor" />
          <h2 className="mt-5 text-[32px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[40px]">
            Understand performance at scale
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-secondary">
            Put predicted average CTR beside flight updates and dashboards that
            surface what needs your attention.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className="dopa-panel p-5">
            <div className="mb-4 text-[13px] text-secondary">Creatives scored by week</div>
            <div className="flex h-40 items-end gap-1.5">
              {[6, 8, 7, 10, 12, 9, 14, 11, 16, 13, 15, 18, 12, 10, 14, 17, 15, 11].map(
                (h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-brand/50"
                    style={{ height: `${h * 5}%` }}
                  />
                ),
              )}
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-tertiary">
              <span>Feb 2025</span>
              <span>May 2025</span>
              <span>Aug 2025</span>
              <span>Nov 2025</span>
            </div>
          </div>

          <div className="space-y-4">
            <Update
              title="Summer Drop"
              status="At risk"
              statusTone="warning"
              by="maya · 1 day ago"
              bullets={[
                "Unbox hook has the higher predicted average CTR",
                "Risk of wasted spend if weak cuts stay in the flight",
              ]}
            />
            <Update
              title="Competitor watch"
              status="On track"
              statusTone="success"
              by="alex · 3 hours ago"
              bullets={[
                "Rival Labs UGC predicted CTR is 1.1% vs your 2.8%",
                "Research agent queued nightly scrape for 3 brands",
              ]}
            />
          </div>
        </div>

        <FeatureLinks
          items={[
            { id: "5.1", label: "Pulse" },
            { id: "5.2", label: "Insights" },
            { id: "5.3", label: "Dashboards" },
          ]}
        />
      </div>
    </section>
  );
}

function Update({
  title,
  status,
  statusTone,
  by,
  bullets,
}: {
  title: string;
  status: string;
  statusTone: "warning" | "success";
  by: string;
  bullets: string[];
}) {
  const tone =
    statusTone === "warning"
      ? "bg-amber-400/15 text-amber-300"
      : "bg-emerald-400/15 text-emerald-300";
  return (
    <div className="dopa-panel p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[14px] font-medium">{title}</span>
        <span className={`rounded px-1.5 py-0.5 text-[11px] ${tone}`}>{status}</span>
      </div>
      <div className="mb-3 text-[12px] text-tertiary">By {by}</div>
      <ul className="space-y-1.5 text-[13px] leading-5 text-secondary">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-tertiary">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

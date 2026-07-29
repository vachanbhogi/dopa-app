import { ArrowRight, DopaMark } from "./icons";

const changelog = [
  {
    title: "TRIBE v2 cortical drivers",
    body: "Inspect which brain ROIs (video vs text-audio) move ROI predictions for each creative.",
    date: "Jul 22, 2026",
  },
  {
    title: "Campaign loops",
    body: "Loops let Dopa Agent re-score flights and pause weak creatives on a recurring schedule.",
    date: "Jul 16, 2026",
  },
  {
    title: "Competitor scrape properties",
    body: "Competitor research now tags hooks, offers, and predicted ROI so you can compare rivals on the same brain→metric stack.",
    date: "Jun 30, 2026",
  },
  {
    title: "Agent-assisted flight updates",
    body: "Flight updates pull recent scores, timeline peaks, and agent actions into a single briefing.",
    date: "Jun 17, 2026",
  },
];

const quotes = [
  {
    quote:
      "We kill weak ads before spend — TRIBE v2 plus Dopa’s metric heads changed how we A/B.",
    name: "Maya Chen",
    role: "Growth Lead, illustrative",
  },
  {
    quote: "Our creative velocity is intense and Dopa keeps us action biased on predicted winners.",
    name: "Alex Rivera",
    role: "Performance Marketing, illustrative",
  },
  {
    quote:
      "Dopa is excellent for pre-spend scoring. Brain signal to ROI in one dashboard.",
    name: "Jordan Lee",
    role: "Media Buyer, illustrative",
  },
];

export function Changelog() {
  return (
    <section id="changelog" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-28">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[28px] font-medium tracking-[-0.02em] md:text-[32px]">
            Changelog
          </h2>
          <a
            href="#changelog"
            className="inline-flex items-center gap-1 text-[13px] text-secondary hover:text-foreground"
          >
            View all
            <ArrowRight />
          </a>
        </div>
        <div className="mt-10 space-y-8">
          {changelog.map((item) => (
            <article
              key={item.title}
              className="grid gap-2 border-b border-white/[0.06] pb-8 last:border-0 md:grid-cols-[1fr_140px]"
            >
              <div>
                <h3 className="text-[16px] font-medium tracking-[-0.01em]">{item.title}</h3>
                <p className="mt-2 max-w-[640px] text-[14px] leading-6 text-secondary">
                  {item.body}
                </p>
              </div>
              <time className="text-[13px] text-tertiary md:text-right">{item.date}</time>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  return (
    <section id="customers" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-28">
        <div className="grid gap-10 md:grid-cols-3">
          {quotes.map((q) => (
            <figure key={q.name}>
              <blockquote className="text-[17px] leading-7 tracking-[-0.01em] text-foreground">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-5 text-[13px]">
                <div className="font-medium">{q.name}</div>
                <div className="text-secondary">{q.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-16 max-w-[520px] text-[16px] leading-7 text-secondary">
          Dopa helps marketing teams predict ad performance before spend. From ambitious
          startups to growing performance orgs.
        </p>
        <a
          href="#customers"
          className="mt-4 inline-flex items-center gap-1 text-[14px] text-foreground hover:opacity-80"
        >
          Customer stories
          <ArrowRight />
        </a>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="border-t border-white/[0.06]">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden px-5 py-28 text-center md:px-8 md:py-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(94,106,210,0.16),transparent_60%)]" />
        <h2 className="relative text-[36px] font-medium tracking-[-0.03em] md:text-[48px]">
          Built for the future.
          <br />
          Available today.
        </h2>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/?modal=signup"
            className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-[14px] font-medium text-[#08090a] hover:opacity-90"
          >
            Get started
          </a>
          <a
            href="#contact"
            className="inline-flex h-10 items-center rounded-lg border border-white/[0.1] px-4 text-[14px] text-foreground hover:bg-white/[0.04]"
          >
            Contact sales
          </a>
          <a
            href="#app"
            className="inline-flex h-10 items-center rounded-lg border border-white/[0.1] px-4 text-[14px] text-foreground hover:bg-white/[0.04]"
          >
            Open app
          </a>
          <a
            href="#download"
            className="inline-flex h-10 items-center rounded-lg border border-white/[0.1] px-4 text-[14px] text-foreground hover:bg-white/[0.04]"
          >
            Download
          </a>
        </div>
      </div>
    </section>
  );
}

const footerCols = [
  {
    title: "Product",
    links: ["Intake", "Plan", "Build", "Diffs", "Monitor", "Pricing", "Security"],
  },
  {
    title: "Features",
    links: [
      "TRIBE v2",
      "Agents",
      "Metric heads",
      "Competitor scrape",
      "Insights",
      "A/B replace",
      "Integrations",
      "Changelog",
    ],
  },
  {
    title: "Company",
    links: ["About", "Customers", "Careers", "Blog", "Method", "Quality", "Brand"],
  },
  {
    title: "Resources",
    links: ["Switch", "Download", "Docs", "Developers", "Status", "Enterprise", "Startups"],
  },
  {
    title: "Connect",
    links: ["Contact us", "Community", "X (Twitter)", "GitHub", "YouTube"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "DPA", "AUP"],
  },
];

export function Footer() {
  return (
    <footer id="contact" className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-8">
        <div className="mb-12 flex items-center gap-2 text-foreground">
          <DopaMark className="h-4 w-4" />
          <span className="text-[14px] font-medium">Dopa</span>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {footerCols.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-[13px] font-medium text-foreground">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-[13px] text-secondary transition-colors hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap gap-4 text-[12px] text-tertiary">
          <span>Privacy</span>
          <span>Terms</span>
          <span>DPA</span>
          <span>AUP</span>
        </div>
      </div>
    </footer>
  );
}

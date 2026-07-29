import Link from "next/link";
import { ArrowRight, DopaMark } from "./icons";

const changelog = [
  {
    title: "TRIBE v2 cortical drivers",
    body: "Inspect the five most responsive predicted cortical regions for each creative.",
    date: "Jul 22, 2026",
  },
  {
    title: "Campaign loops",
    body: "Loops let Dopa Agent re-score flights and pause weak creatives on a recurring schedule.",
    date: "Jul 16, 2026",
  },
  {
    title: "Competitor scrape properties",
    body: "Competitor research tags hooks, offers, and predicted average CTR so you can compare creatives consistently.",
    date: "Jun 30, 2026",
  },
  {
    title: "Agent-assisted flight updates",
    body: "Flight updates pull recent scores, cortical response summaries, and agent actions into one briefing.",
    date: "Jun 17, 2026",
  },
];

const quotes = [
  {
    quote:
      "We compare ad concepts before spend — TRIBE v2 plus Dopa’s CTR prediction changed how we review creative.",
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
      "Dopa puts a predicted average CTR and modeled cortical response in one dashboard.",
    name: "Jordan Lee",
    role: "Media Buyer, illustrative",
  },
];

export function Changelog() {
  return (
    <section id="changelog" className="border-t border-white/6">
      <div className="mx-auto max-w-300 px-5 py-24 md:px-8 md:py-28">
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
              className="grid gap-2 border-b border-white/6 pb-8 last:border-0 md:grid-cols-[1fr_140px]"
            >
              <div>
                <h3 className="text-[16px] font-medium tracking-[-0.01em]">{item.title}</h3>
                <p className="mt-2 max-w-160 text-[14px] leading-6 text-secondary">
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
    <section id="customers" className="border-t border-white/6">
      <div className="mx-auto max-w-300 px-5 py-24 md:px-8 md:py-28">
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
        <p className="mt-16 max-w-130 text-[16px] leading-7 text-secondary">
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
    <section className="border-t border-white/6">
      <div className="relative mx-auto max-w-300 overflow-hidden px-5 py-28 text-center md:px-8 md:py-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(94,106,210,0.16),transparent_60%)]" />
        <h2 className="relative text-[36px] font-medium tracking-[-0.03em] md:text-[48px]">
          Built for the future.
          <br />
          Available today.
        </h2>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/?modal=signup"
            className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-[14px] font-medium text-[#08090a] hover:opacity-90"
          >
            Get started
          </Link>
          <a
            href="#contact"
            className="inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-[14px] text-foreground hover:bg-white/4"
          >
            Contact sales
          </a>
          <a
            href="#app"
            className="inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-[14px] text-foreground hover:bg-white/4"
          >
            Open app
          </a>
          <a
            href="#download"
            className="inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-[14px] text-foreground hover:bg-white/4"
          >
            Download
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer id="contact" className="border-t border-white/6 bg-[#08090a]">
      <div className="mx-auto flex max-w-300 flex-col md:flex-row items-center justify-between gap-6 px-5 py-8 md:px-8">
        <div className="flex items-center gap-2 text-foreground">
          <DopaMark className="h-4 w-4 text-white" />
          <span className="text-[14px] font-medium text-white">Dopa</span>
          <span className="text-[12px] text-tertiary ml-2">© {new Date().getFullYear()} Dopa, Inc.</span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-[13px] text-secondary">
          <Link href="/demo" className="transition-colors hover:text-white">Demo</Link>
          <Link href="/dashboard" className="transition-colors hover:text-white">Dashboard</Link>
          <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

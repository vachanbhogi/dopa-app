import { ArrowRight } from "./icons";
import { HeroIssueDemo } from "./HeroIssueDemo";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_50%_20%,rgba(88,92,140,0.22),transparent_58%)]" />

      <div className="relative mx-auto max-w-300 px-5 md:px-8">
        <div className="max-w-205 pb-10 pt-16 md:pb-14 md:pt-22">
          <h1 className="animate-fade-up text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[52px] md:text-[64px]">
            The agentic campaign
            <br />
            system for marketing teams
          </h1>

          <div className="animate-fade-up-delay mt-6 flex flex-col gap-4 sm:mt-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <p className="max-w-105 text-[15px] leading-6 text-[#8a8f98] md:text-[16px] md:leading-7">
              Upload an ad, predict its average click-through rate, and inspect
              the cortical response modeled by TRIBE v2.
            </p>

            <a
              href="#pipeline"
              className="inline-flex shrink-0 items-center gap-2 self-start text-[14px] text-white transition-opacity hover:opacity-80 sm:self-auto"
            >
              <span className="rounded-[5px] border border-white/15 bg-white/4 px-1.5 py-0.5 text-[11px] font-medium leading-none text-[#c7cad1]">
                New
              </span>
              TRIBE v2 pipeline
              <ArrowRight className="h-3.5 w-3.5 opacity-70" />
            </a>
          </div>
        </div>

        <div className="animate-fade-up-delay-2 relative">
          <HeroIssueDemo />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-[#08090a] to-transparent md:h-40" />
        </div>
      </div>
    </section>
  );
}

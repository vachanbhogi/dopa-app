import { DemoHeader } from "@/components/demo/DemoHeader";
import { Footer } from "@/components/landing/Closing";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <DemoHeader />

      <main className="relative pt-28 pb-20 px-5 md:px-8 max-w-200 mx-auto flex-1 w-full">
        <h1 className="text-[32px] font-semibold text-white tracking-[-0.03em] mb-3">
          Terms of Service
        </h1>
        <p className="text-[13px] text-tertiary font-mono mb-8">
          Last updated: July 29, 2026
        </p>

        <div className="space-y-6 text-[14px] leading-7 text-secondary">
          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Dopa platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform or services.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">2. Use of Platform</h2>
            <p>
              Dopa provides AI-driven advertising performance predictions and cortical neural response estimates. You agree to use the platform solely for lawful marketing and creative evaluation purposes and in compliance with all applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">3. Intellectual Property</h2>
            <p>
              You retain all ownership rights to the ad content, media assets, and creative copy uploaded to Dopa. Dopa retains all proprietary rights, algorithms, model weights, and software interface designs.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">4. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              Dopa predictions are generated using probabilistic neural network models. While highly correlated with test ad outcomes, metrics are provided for analytical guidance and do not guarantee specific real-world advertising return on ad spend (ROAS).
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">5. Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service following notice of updates constitutes acceptance of revised terms.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

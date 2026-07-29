import { DemoHeader } from "@/components/demo/DemoHeader";
import { Footer } from "@/components/landing/Closing";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <DemoHeader />

      <main className="relative pt-28 pb-20 px-5 md:px-8 max-w-200 mx-auto flex-1 w-full">
        <h1 className="text-[32px] font-semibold text-white tracking-[-0.03em] mb-3">
          Privacy Policy
        </h1>
        <p className="text-[13px] text-tertiary font-mono mb-8">
          Last updated: July 29, 2026
        </p>

        <div className="space-y-6 text-[14px] leading-7 text-secondary">
          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">1. Overview</h2>
            <p>
              Dopa (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your data when you use the Dopa AI campaign prediction platform and associated services.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">2. Data We Collect</h2>
            <p>
              We collect information you provide directly to us when creating an account, uploading ad video files, interacting with our prediction tools, or messaging Denver. Denver requests include the chat text and the Dopa page you are viewing. Uploaded ad assets are analyzed to produce a predicted average click-through rate and modeled cortical response.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">3. How We Use Data</h2>
            <p>
              Your data is strictly utilized to deliver ad performance predictions, generate cortical response telemetry, improve model accuracy, and provide customer support. Denver messages and page context are processed by Groq for safety classification and response generation. We do not sell your creative assets or personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">4. Data Security &amp; Retention</h2>
            <p>
              We employ enterprise-grade encryption for data in transit and at rest. Uploaded creative assets remain isolated to your organization workspace.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium text-white mb-2">5. Contact Us</h2>
            <p>
              If you have questions regarding this Privacy Policy, please contact our support team.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

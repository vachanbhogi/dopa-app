import type { Metadata } from "next";
import { DemoHeader } from "@/components/demo/DemoHeader";
import { Footer } from "@/components/landing/Closing";

export const metadata: Metadata = {
  title: "Privacy Policy | Dopa",
  description:
    "How Dopa collects, uses, shares, and protects information in its advertising analysis platform.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-background text-foreground">
      <DemoHeader />

      <main className="relative mx-auto w-full max-w-200 flex-1 px-5 pb-20 pt-28 md:px-8">
        <h1 className="mb-3 text-[32px] font-semibold tracking-[-0.03em] text-white">
          Privacy Policy
        </h1>
        <p className="mb-3 font-mono text-[13px] text-tertiary">
          Last updated: July 29, 2026
        </p>
        <p className="mb-10 text-[13px] leading-6 text-tertiary">
          This policy describes Dopa&apos;s current product behavior. It does not
          apply to third-party services you choose to connect except where Dopa
          receives information from them.
        </p>

        <div className="space-y-8 text-[14px] leading-7 text-secondary">
          <PolicySection title="1. Scope">
            <p>
              This Privacy Policy applies when you use Dopa&apos;s website,
              dashboard, ad-scoring tools, AI assistants, and related services
              (the &quot;Service&quot;). By using the Service, you acknowledge
              the practices described here.
            </p>
          </PolicySection>

          <PolicySection title="2. Information we collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-white">Account information:</span> name,
                email address, authentication records, and essential session
                cookies. Password authentication is handled by our
                authentication provider.
              </li>
              <li>
                <span className="text-white">Workspace information:</span>{" "}
                business profiles, product details, audiences, competitors,
                campaign goals, keywords, and other content you enter.
              </li>
              <li>
                <span className="text-white">Creative and model data:</span> ad
                videos you submit, technical file metadata, predicted average
                CTR, modeled cortical responses, and related analysis results.
              </li>
              <li>
                <span className="text-white">Connected-service data:</span>{" "}
                Google account identifiers, OAuth tokens, Google Ads account
                details, campaign performance, and keyword metrics when you
                authorize that integration.
              </li>
              <li>
                <span className="text-white">AI request data:</span> prompts and
                relevant workspace or page context sent for Denver responses,
                business discovery, public-web competitor research, and keyword
                generation. Competitor research stores source URLs, short
                paraphrased evidence, scores, and observation dates rather than
                full scraped pages.
              </li>
              <li>
                <span className="text-white">Technical information:</span> IP
                address, browser and device information, request timestamps,
                and diagnostic data that our hosting and service providers
                ordinarily process to operate and secure the Service.
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="3. How we collect information">
            <p>
              We collect information directly from you, automatically when your
              browser communicates with the Service, from websites you ask Dopa
              to scan, and from services you choose to connect. Do not submit
              information that you are not authorized to use or share.
            </p>
          </PolicySection>

          <PolicySection title="4. How we use information">
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide, maintain, secure, and troubleshoot the Service.</li>
              <li>
                Authenticate users and keep each organization&apos;s workspace
                associated with its account.
              </li>
              <li>
                Analyze submitted ads and return predictions and modeled
                cortical-response visualizations.
              </li>
              <li>
                Generate requested AI responses, source-backed competitor
                research, monitoring alerts, and keyword ideas.
              </li>
              <li>
                Display reporting from connected accounts and refresh
                authorization when necessary.
              </li>
              <li>
                Prevent abuse, enforce our Terms, and comply with legal
                obligations.
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="5. Service providers and disclosures">
            <p>
              We disclose information as needed to providers that support
              authentication and database hosting (Supabase), AI processing
              (Groq and Alibaba Cloud Model Studio), competitor-research
              infrastructure (Alibaba Cloud), ad scoring and cortical modeling,
              infrastructure and hosting, and services you connect (including
              Google). These providers process
              information under their own terms and our arrangements with them.
              We may also disclose information when required by law, to protect
              users or the Service, or as part of a merger, financing,
              acquisition, or sale of assets.
            </p>
            <p className="mt-3">
              Dopa does not sell personal information or use it for
              cross-context behavioral advertising. If this practice changes,
              we will update this policy and provide any legally required
              choices before doing so.
            </p>
          </PolicySection>

          <PolicySection title="6. Cookies and connected accounts">
            <p>
              Dopa uses essential cookies for authentication, security, user
              preferences, and connected-account authorization. Blocking these
              cookies may prevent the dashboard from working. Google Ads access
              is read-only in the current product. Disconnecting Google Ads
              removes Dopa&apos;s stored authorization cookie but does not
              delete information held by Google.
            </p>
          </PolicySection>

          <PolicySection title="7. Retention">
            <p>
              We retain information for as long as reasonably needed to provide
              the Service, secure it, resolve disputes, and meet legal
              obligations. Structured competitor evidence is normally retained
              for 90 days; minimal research input snapshots and provider request
              metadata are normally removed after 30 days. Uploaded media and
              generated model assets may be retained temporarily by the scoring
              service to complete and deliver an analysis. Some records may
              remain in backups or fraud-prevention logs for a limited period
              after deletion.
            </p>
          </PolicySection>

          <PolicySection title="8. Security">
            <p>
              We use reasonable administrative and technical safeguards
              appropriate to the information we process, including
              authentication controls, transport security, row-level database
              access controls, and encrypted storage for Google authorization
              tokens. No online service can guarantee absolute security. Keep
              your credentials confidential and notify us if you believe your
              account has been compromised.
            </p>
          </PolicySection>

          <PolicySection title="9. Your choices and privacy rights">
            <p>
              You can update workspace data in the dashboard and disconnect
              Google Ads from its integration page. You can also disable daily
              competitor monitoring or in-app alerts at any time.
              Depending on where you live, you may also have rights to request
              access, correction, deletion, or a copy of personal information,
              to object to or restrict certain processing, and to appeal a
              denied request. We will not discriminate against you for
              exercising a privacy right.
            </p>
            <p className="mt-3">
              Submit a request through the Dopa support channel available to
              your organization. We may need to verify your identity and may
              retain information where an exception applies. Authorized agents
              should identify the user they represent and provide proof of
              authority.
            </p>
          </PolicySection>

          <PolicySection title="10. Children">
            <p>
              The Service is intended for business users and is not directed to
              children under 13. We do not knowingly collect personal
              information from children under 13. If you believe a child
              submitted information, contact us so we can review and delete it
              where required.
            </p>
          </PolicySection>

          <PolicySection title="11. International processing">
            <p>
              Dopa and its providers may process information in countries other
              than where you live. Those countries may have different data
              protection laws. Where required, we use an appropriate legal
              basis and safeguards for these transfers.
            </p>
          </PolicySection>

          <PolicySection title="12. Changes and contact">
            <p>
              We may update this policy as the Service changes. We will revise
              the date above and provide additional notice when required. For
              questions or privacy requests, use the Dopa support channel
              available to your organization. Dedicated public privacy contact
              details will be added here before the Service is made generally
              available.
            </p>
          </PolicySection>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[16px] font-medium text-white">{title}</h2>
      {children}
    </section>
  );
}

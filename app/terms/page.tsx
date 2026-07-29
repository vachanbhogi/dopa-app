import type { Metadata } from "next";
import Link from "next/link";
import { DemoHeader } from "@/components/demo/DemoHeader";
import { Footer } from "@/components/landing/Closing";

export const metadata: Metadata = {
  title: "Terms of Service | Dopa",
  description:
    "Terms governing access to Dopa's advertising analysis and campaign intelligence platform.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-background text-foreground">
      <DemoHeader />

      <main className="relative mx-auto w-full max-w-200 flex-1 px-5 pb-20 pt-28 md:px-8">
        <h1 className="mb-3 text-[32px] font-semibold tracking-[-0.03em] text-white">
          Terms of Service
        </h1>
        <p className="mb-10 font-mono text-[13px] text-tertiary">
          Last updated: July 29, 2026
        </p>

        <div className="space-y-8 text-[14px] leading-7 text-secondary">
          <TermsSection title="1. Agreement">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to
              Dopa&apos;s website, dashboard, ad-scoring tools, AI assistants,
              integrations, and related services (the &quot;Service&quot;). By
              creating an account or using the Service, you agree to these Terms
              and our{" "}
              <Link
                href="/privacy"
                className="text-white underline decoration-white/40 underline-offset-2"
              >
                Privacy Policy
              </Link>
              . If you use Dopa for an organization, you represent that you can
              bind that organization to these Terms.
            </p>
          </TermsSection>

          <TermsSection title="2. Eligibility and accounts">
            <p>
              You must be at least 18 and able to enter a binding agreement to
              use the Service. Provide accurate account information, protect
              your credentials, and promptly notify us of unauthorized access.
              You are responsible for activity under your account and for
              ensuring that authorized teammates follow these Terms.
            </p>
          </TermsSection>

          <TermsSection title="3. The Service and AI outputs">
            <p>
              Dopa provides advertising analysis, predicted performance
              metrics, modeled cortical responses, source-backed public-web
              competitor research, and connected-account reporting. Predictions
              and AI-generated analysis remain probabilistic. Sources may
              change, disappear, or contain errors, so you must review the
              evidence before acting.
            </p>
            <p className="mt-3">
              Modeled cortical responses are not measurements of a particular
              person, medical advice, or a diagnosis. You must review outputs
              before relying on them. Dopa does not guarantee impressions,
              clicks, conversions, revenue, ROAS, or any other campaign result.
            </p>
          </TermsSection>

          <TermsSection title="4. Your content and permissions">
            <p>
              You retain ownership of ad videos, business information,
              prompts, and other material you submit (&quot;Customer
              Content&quot;). You grant Dopa and its service providers a
              non-exclusive, worldwide, limited license to host, copy, transmit,
              analyze, and display Customer Content only as needed to operate,
              secure, and improve the Service and comply with law.
            </p>
            <p className="mt-3">
              You represent that you have all rights and permissions needed to
              submit Customer Content and connect third-party accounts,
              including rights relating to copyright, trademarks, publicity,
              privacy, advertising, and personal information.
            </p>
          </TermsSection>

          <TermsSection title="5. Acceptable use">
            <p>You may not use the Service to:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>break a law or another person&apos;s rights;</li>
              <li>
                upload malware, harmful code, unlawful surveillance material,
                or content you are not authorized to process;
              </li>
              <li>
                probe, bypass, or disrupt security, rate limits, access
                controls, or account boundaries;
              </li>
              <li>
                reverse engineer or extract models, source code, system prompts,
                or non-public data except where law expressly permits it;
              </li>
              <li>
                misrepresent AI estimates as observed facts, scientific
                measurements, or guaranteed business outcomes; or
              </li>
              <li>
                use automated means to overload, scrape, or resell the Service
                without written permission.
              </li>
            </ul>
          </TermsSection>

          <TermsSection title="6. Connected and third-party services">
            <p>
              The Service may interoperate with Supabase, Groq, Google Ads,
              Alibaba Cloud, browser push services, model-hosting
              infrastructure, and other third parties. Their services are
              governed by their own terms and policies. You authorize Dopa to
              exchange the information necessary to perform actions you
              request. The current Google Ads integration is read-only and does
              not authorize Dopa to create campaigns or spend funds.
            </p>
          </TermsSection>

          <TermsSection title="7. Dopa technology">
            <p>
              Dopa and its licensors retain all rights in the Service,
              including software, interfaces, models, workflows, branding, and
              documentation. Except for the limited right to use the Service
              under these Terms, no intellectual-property rights are
              transferred to you. Open-source components remain governed by
              their applicable licenses.
            </p>
          </TermsSection>

          <TermsSection title="8. Feedback">
            <p>
              If you provide suggestions or feedback, you grant Dopa permission
              to use it without restriction or compensation, provided we do not
              identify you publicly as the source without permission.
            </p>
          </TermsSection>

          <TermsSection title="9. Availability, changes, and beta features">
            <p>
              We may modify, suspend, or discontinue parts of the Service and
              may impose reasonable usage limits. Experimental or beta features
              may change without notice and may be less reliable. We will try
              to avoid material disruption but do not promise uninterrupted or
              error-free availability.
            </p>
          </TermsSection>

          <TermsSection title="10. Suspension and termination">
            <p>
              You may stop using the Service at any time. We may suspend or
              terminate access if you materially breach these Terms, create a
              security or legal risk, fail to pay an agreed fee, or use the
              Service in a way that could harm Dopa, its providers, or other
              users. Provisions that by their nature should survive termination
              will survive.
            </p>
          </TermsSection>

          <TermsSection title="11. Disclaimers">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE AND ALL
              OUTPUTS ARE PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE.&quot; DOPA DISCLAIMS IMPLIED WARRANTIES, INCLUDING
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              NON-INFRINGEMENT, AND WARRANTIES ARISING FROM COURSE OF DEALING.
              These disclaimers do not limit rights that cannot legally be
              waived.
            </p>
          </TermsSection>

          <TermsSection title="12. Limitation of liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, DOPA AND ITS AFFILIATES,
              LICENSORS, AND PROVIDERS WILL NOT BE LIABLE FOR INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
              DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, GOODWILL, CAMPAIGN
              SPEND, OR BUSINESS OPPORTUNITIES, ARISING FROM OR RELATED TO THE
              SERVICE. Nothing in these Terms excludes liability that cannot
              legally be excluded.
            </p>
          </TermsSection>

          <TermsSection title="13. Indemnity">
            <p>
              To the extent permitted by law, you will defend and indemnify Dopa
              and its affiliates from third-party claims arising from your
              Customer Content, connected accounts, violation of these Terms,
              or violation of another person&apos;s rights.
            </p>
          </TermsSection>

          <TermsSection title="14. General terms">
            <p>
              These Terms and the Privacy Policy are the entire agreement about
              the Service unless you have a separate written agreement with
              Dopa. If a provision is unenforceable, the remaining provisions
              remain effective. You may not assign these Terms without our
              consent; Dopa may assign them as part of a reorganization,
              financing, merger, or sale. A failure to enforce a provision is
              not a waiver.
            </p>
          </TermsSection>

          <TermsSection title="15. Changes and contact">
            <p>
              We may update these Terms as the Service changes. We will revise
              the date above and provide additional notice when legally
              required. Continued use after the effective date means you accept
              the revised Terms. For questions, use the Dopa support channel
              available to your organization. Dedicated public contact details
              will be added here before the Service is made generally
              available.
            </p>
          </TermsSection>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function TermsSection({
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

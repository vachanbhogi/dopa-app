import type { Metadata } from "next";
import { DesktopOnly } from "@/components/DesktopOnly";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Try Dopa — Import your brand",
  description:
    "Account-free onboarding demo. Scan alibaba.com or your own website and review a draft brand profile.",
};

export default function DemoPage() {
  return (
    <DesktopOnly surface="demo">
      <OnboardingFlow firstName="there" demoMode />
    </DesktopOnly>
  );
}

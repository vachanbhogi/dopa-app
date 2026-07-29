import type { Metadata } from "next";
import { DesktopOnly } from "@/components/DesktopOnly";
import { DemoDashboardShell } from "@/components/demo/DemoDashboardShell";

export const metadata: Metadata = {
  title: "Demo dashboard — Dopa",
  description:
    "Explore the real Dopa dashboard after brand intake — no account required.",
};

export default function DemoDashboardPage() {
  return (
    <DesktopOnly surface="demo">
      <div className="relative h-dvh overflow-hidden bg-[#08090a] text-white">
        <DemoDashboardShell initialTab="brain" />
      </div>
    </DesktopOnly>
  );
}

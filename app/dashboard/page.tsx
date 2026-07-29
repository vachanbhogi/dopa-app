import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import {
  DashboardShell,
  type DashboardTab,
} from "@/components/dashboard/DashboardShell";
import { getBusinessesForUser } from "@/lib/businesses";

const dashboardTabs = new Set<DashboardTab>([
  "keywords",
  "competitors",
  "products",
  "brain",
  "googleAds",
  "metrics",
  "settings",
]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; googleAds?: string }>;
}) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?modal=login&redirectTo=/dashboard");
  }

  const displayName =
    user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";
  const { tab, googleAds } = await searchParams;
  const initialTab =
    tab && dashboardTabs.has(tab as DashboardTab)
      ? (tab as DashboardTab)
      : "brain";

  const { businesses, selectedBusinessId } = await getBusinessesForUser(user.id);

  if (businesses.length === 0) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell
      key={selectedBusinessId ?? "no-selected-business"}
      displayName={displayName}
      email={user.email ?? ""}
      businesses={businesses}
      initialSelectedBusinessId={selectedBusinessId}
      initialTab={initialTab}
      googleAdsResult={googleAds}
    />
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getBusinessesForUser } from "@/lib/businesses";

export default async function DashboardPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?modal=login&redirectTo=/dashboard");
  }

  const displayName =
    user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";

  const { businesses, selectedBusinessId } = await getBusinessesForUser(user.id, {
    fullName: user.user_metadata?.full_name,
    email: user.email,
  });

  return (
    <DashboardShell
      displayName={displayName}
      email={user.email ?? ""}
      businesses={businesses}
      initialSelectedBusinessId={selectedBusinessId}
    />
  );
}

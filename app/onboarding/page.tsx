import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { getBusinessesForUser } from "@/lib/businesses";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?modal=login&redirectTo=/onboarding");
  }

  const { businesses } = await getBusinessesForUser(user.id);

  if (businesses.length > 0) {
    redirect("/dashboard");
  }

  const firstName =
    user.user_metadata?.full_name?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "there";

  return <OnboardingFlow firstName={firstName} />;
}

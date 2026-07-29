import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export type Business = {
  id: string;
  name: string;
};

function defaultBusinessName(fullName?: string | null, email?: string | null): string {
  if (fullName?.trim()) return fullName.trim();
  if (email) {
    const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (local) {
      return local
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }
  return "My Business";
}

export async function getBusinessesForUser(
  userId: string,
  options?: { fullName?: string | null; email?: string | null },
): Promise<{ businesses: Business[]; selectedBusinessId: string | null }> {
  const supabase = createClient(await cookies());

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  let list = businesses ?? [];

  if (list.length === 0) {
    const { data: created, error: insertError } = await supabase
      .from("businesses")
      .insert({
        owner_id: userId,
        name: defaultBusinessName(options?.fullName, options?.email),
      })
      .select("id, name")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    list = [created];
  }

  const { data: prefs, error: prefsError } = await supabase
    .from("user_preferences")
    .select("selected_business_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefsError) {
    throw new Error(prefsError.message);
  }

  const validIds = new Set(list.map((business) => business.id));
  let selectedBusinessId = prefs?.selected_business_id ?? null;

  if (!selectedBusinessId || !validIds.has(selectedBusinessId)) {
    selectedBusinessId = list[0]?.id ?? null;
  }

  return { businesses: list, selectedBusinessId };
}

"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type CompetitorItem = {
  id: string;
  business_id: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  primary_angle: string | null;
  predicted_ctr: number | null;
  status: string;
  created_at: string;
};

async function requireUser() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, supabase, user: null };
  return { supabase, user, error: null };
}

async function assertBusinessOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  businessId: string,
) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Business not found" };
  return { ok: true as const };
}

export async function listCompetitors(businessId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const owned = await assertBusinessOwner(
    auth.supabase,
    auth.user.id,
    businessId,
  );
  if ("error" in owned) return { error: owned.error };

  const { data, error } = await auth.supabase
    .from("competitors")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { competitors: data as CompetitorItem[] };
}

export async function addCompetitor(
  businessId: string,
  input: {
    name: string;
    website_url?: string;
    primary_angle?: string;
    predicted_ctr?: number;
  }
) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const name = input.name.trim();
  if (!name) return { error: "Competitor name is required" };

  const owned = await assertBusinessOwner(
    auth.supabase,
    auth.user.id,
    businessId,
  );
  if ("error" in owned) return { error: owned.error };

  const { data, error } = await auth.supabase
    .from("competitors")
    .insert({
      business_id: businessId,
      name,
      website_url: input.website_url?.trim() || null,
      primary_angle: input.primary_angle?.trim() || null,
      predicted_ctr: input.predicted_ctr ?? null,
      status: "tracking",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { competitor: data as CompetitorItem };
}

export async function deleteCompetitor(competitorId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const { data: existing, error: fetchError } = await auth.supabase
    .from("competitors")
    .select("id, business_id")
    .eq("id", competitorId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Competitor not found" };

  const owned = await assertBusinessOwner(
    auth.supabase,
    auth.user.id,
    existing.business_id,
  );
  if ("error" in owned) return { error: owned.error };

  const { error } = await auth.supabase
    .from("competitors")
    .delete()
    .eq("id", competitorId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

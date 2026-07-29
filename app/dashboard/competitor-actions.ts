"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { normalizedDomain } from "@/lib/competitor-intelligence/validation";
import { isUuid } from "@/lib/validation";

export type CompetitorItem = {
  id: string;
  business_id: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  primary_angle: string | null;
  candidate_id: string | null;
  normalized_domain: string | null;
  relationship: "direct" | "indirect" | "emerging" | null;
  threat_score: number | null;
  confidence: number | null;
  threat_horizon: "now" | "next_6_months" | "next_12_months" | null;
  why_now: string | null;
  status: string;
  created_at: string;
};

type CandidateRecord = {
  id: string;
  business_id: string;
  name: string;
  website_url: string;
  normalized_domain: string;
  relationship: "direct" | "indirect" | "emerging";
  threat_score: number;
  confidence: number;
  threat_horizon: "now" | "next_6_months" | "next_12_months";
  why_competitor: string;
  why_now: string;
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
  if (!isUuid(businessId)) return { error: "Invalid business" };
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
    candidateId?: string;
  }
) {
  if (!isUuid(businessId)) return { error: "Invalid business" };
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

  let candidate: CandidateRecord | null = null;
  if (input.candidateId && !isUuid(input.candidateId)) {
    return { error: "Invalid research candidate" };
  }
  if (input.candidateId) {
    const { data: found, error: candidateError } = await auth.supabase
      .from("competitor_candidates")
      .select(
        "id, business_id, name, website_url, normalized_domain, relationship, threat_score, confidence, threat_horizon, why_competitor, why_now",
      )
      .eq("id", input.candidateId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (candidateError) return { error: candidateError.message };
    if (!found) return { error: "Research candidate not found" };
    candidate = found as CandidateRecord;
  }

  const websiteUrl =
    candidate?.website_url ?? (input.website_url?.trim() || null);
  const { data, error } = await auth.supabase
    .from("competitors")
    .insert({
      business_id: businessId,
      name: candidate?.name ?? name,
      website_url: websiteUrl,
      primary_angle:
        candidate?.why_competitor ?? (input.primary_angle?.trim() || null),
      candidate_id: candidate?.id ?? null,
      normalized_domain:
        candidate?.normalized_domain ?? normalizedDomain(websiteUrl),
      relationship: candidate?.relationship ?? null,
      threat_score: candidate?.threat_score ?? null,
      confidence: candidate?.confidence ?? null,
      threat_horizon: candidate?.threat_horizon ?? null,
      why_now: candidate?.why_now ?? null,
      status: "tracking",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { competitor: data as CompetitorItem };
}

export async function deleteCompetitor(competitorId: string) {
  if (!isUuid(competitorId)) return { error: "Invalid competitor" };
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

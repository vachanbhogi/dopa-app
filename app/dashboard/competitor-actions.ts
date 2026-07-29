"use server";

import { normalizedDomain } from "@/lib/competitor-intelligence/validation";
import { isUuid, normalizeOptionalHttpUrl } from "@/lib/validation";
import { databaseFailure } from "@/utils/action-security";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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

const COMPETITOR_SELECT =
  "id, business_id, name, website_url, logo_url, primary_angle, candidate_id, normalized_domain, relationship, threat_score, confidence, threat_horizon, why_now, status, created_at";

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

  if (error) {
    return databaseFailure(
      "assert_competitor_business_owner",
      error,
      "The business could not be verified. Try again.",
    );
  }
  if (!data) return { error: "Business not found" };
  return { ok: true as const };
}

export async function listCompetitors(businessId: string) {
  if (!isUuid(businessId)) {
    return {
      error: "Invalid business ID",
      competitors: [] as CompetitorItem[],
    };
  }

  const auth = await requireUser();
  if (auth.error || !auth.user) {
    return {
      error: auth.error ?? "Not authenticated",
      competitors: [] as CompetitorItem[],
    };
  }

  const owned = await assertBusinessOwner(
    auth.supabase,
    auth.user.id,
    businessId,
  );
  if ("error" in owned) {
    return { error: owned.error, competitors: [] as CompetitorItem[] };
  }

  const { data, error } = await auth.supabase
    .from("competitors")
    .select(COMPETITOR_SELECT)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ...databaseFailure(
        "list_competitors",
        error,
        "Competitors could not be loaded. Try again.",
      ),
      competitors: [] as CompetitorItem[],
    };
  }

  return { competitors: data as CompetitorItem[], error: null };
}

export async function addCompetitor(
  businessId: string,
  input: {
    name: string;
    website_url?: string;
    primary_angle?: string;
    candidateId?: string;
  },
) {
  if (!isUuid(businessId)) return { error: "Invalid business ID" };

  const auth = await requireUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Not authenticated" };
  }

  const name = input.name.trim();
  if (!name) return { error: "Competitor name is required" };
  if (name.length > 160 || /[\u0000]/.test(name)) {
    return { error: "Competitor name must be 160 characters or fewer" };
  }

  const website = normalizeOptionalHttpUrl(input.website_url);
  if (!website.success) return { error: website.error };
  const primaryAngle = input.primary_angle?.trim() || null;
  if (
    (primaryAngle && primaryAngle.length > 1_000) ||
    primaryAngle?.includes("\u0000")
  ) {
    return { error: "Primary angle must be 1,000 characters or fewer" };
  }

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

    if (candidateError) {
      return databaseFailure(
        "load_competitor_candidate",
        candidateError,
        "The research candidate could not be loaded. Try again.",
      );
    }
    if (!found) return { error: "Research candidate not found" };
    candidate = found as CandidateRecord;
  }

  const websiteUrl = candidate?.website_url ?? website.value;
  const { data, error } = await auth.supabase
    .from("competitors")
    .insert({
      business_id: businessId,
      name: candidate?.name ?? name,
      website_url: websiteUrl,
      primary_angle: candidate?.why_competitor ?? primaryAngle,
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
    .select(COMPETITOR_SELECT)
    .single();

  if (error) return databaseFailure("create_competitor", error);

  revalidatePath("/dashboard");
  return { competitor: data as CompetitorItem, error: null };
}

export async function deleteCompetitor(competitorId: string) {
  if (!isUuid(competitorId)) return { error: "Invalid competitor ID" };

  const auth = await requireUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Not authenticated" };
  }

  const { data: existing, error: fetchError } = await auth.supabase
    .from("competitors")
    .select("id, business_id")
    .eq("id", competitorId)
    .maybeSingle();

  if (fetchError) {
    return databaseFailure(
      "load_competitor_for_delete",
      fetchError,
      "The competitor could not be deleted. Try again.",
    );
  }
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

  if (error) {
    return databaseFailure(
      "delete_competitor",
      error,
      "The competitor could not be deleted. Try again.",
    );
  }

  revalidatePath("/dashboard");
  return { success: true, error: null };
}

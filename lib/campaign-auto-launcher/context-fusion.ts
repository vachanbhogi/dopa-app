import type { SupabaseClient } from "@supabase/supabase-js";

export interface FusedCampaignContext {
  business: {
    id: string;
    name: string;
    website?: string | null;
    industry?: string | null;
    description?: string | null;
    targetAudience?: string | null;
    valueProposition?: string | null;
  };
  product?: {
    id: string;
    name: string;
    valueProp?: string | null;
    price?: number | null;
    features?: string[] | null;
  } | null;
  competitors: Array<{
    name: string;
    domain?: string | null;
    relationship: string;
    threatScore: number;
    whyCompetitor: string;
    whyNow: string;
    evidence: Array<{
      title: string;
      claim: string;
      sourceUrl?: string | null;
    }>;
  }>;
  existingKeywords: string[];
}

export async function fuseCampaignContext(
  supabase: SupabaseClient,
  businessId: string,
  productId?: string,
): Promise<FusedCampaignContext> {
  // 1. Fetch Business Details
  const { data: businessData, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, website, industry, description, target_audience, value_proposition")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !businessData) {
    throw new Error(`Failed to load business context for ID ${businessId}`);
  }

  // 2. Fetch Selected Product if specified
  let product: FusedCampaignContext["product"] = null;
  if (productId) {
    const { data: productData } = await supabase
      .from("products")
      .select("id, product_name, value_prop, price, features")
      .eq("id", productId)
      .maybeSingle();

    if (productData) {
      product = {
        id: productData.id,
        name: productData.product_name,
        valueProp: productData.value_prop,
        price: typeof productData.price === "number" ? productData.price : null,
        features: Array.isArray(productData.features) ? productData.features : null,
      };
    }
  }

  // 3. Fetch Recent Competitor Research & Candidates
  const { data: recentRun } = await supabase
    .from("competitor_research_runs")
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let competitors: FusedCampaignContext["competitors"] = [];
  if (recentRun) {
    const { data: candidates } = await supabase
      .from("competitor_candidates")
      .select("id, name, normalized_domain, relationship, threat_score, why_competitor, why_now")
      .eq("run_id", recentRun.id)
      .order("threat_score", { ascending: false })
      .limit(5);

    if (candidates && candidates.length > 0) {
      const candidateIds = candidates.map((c) => c.id);
      const { data: evidenceData } = await supabase
        .from("competitor_evidence")
        .select("candidate_id, title, claim, source_url")
        .in("candidate_id", candidateIds);

      const evidenceMap = new Map<string, Array<{ title: string; claim: string; sourceUrl?: string | null }>>();
      if (evidenceData) {
        for (const item of evidenceData) {
          const list = evidenceMap.get(item.candidate_id) ?? [];
          list.push({
            title: item.title,
            claim: item.claim,
            sourceUrl: item.source_url,
          });
          evidenceMap.set(item.candidate_id, list);
        }
      }

      competitors = candidates.map((c) => ({
        name: c.name,
        domain: c.normalized_domain,
        relationship: c.relationship,
        threatScore: c.threat_score,
        whyCompetitor: c.why_competitor,
        whyNow: c.why_now,
        evidence: evidenceMap.get(c.id) ?? [],
      }));
    }
  }

  // Fallback to tracked competitors if research run had no candidates
  if (competitors.length === 0) {
    const { data: tracked } = await supabase
      .from("competitor_tracked")
      .select("name, normalized_domain, primary_angle, threat_score")
      .eq("business_id", businessId)
      .limit(5);

    if (tracked && tracked.length > 0) {
      competitors = tracked.map((t) => ({
        name: t.name,
        domain: t.normalized_domain,
        relationship: "direct",
        threatScore: t.threat_score ?? 70,
        whyCompetitor: t.primary_angle || "Direct market rival",
        whyNow: "Active competitor",
        evidence: [],
      }));
    }
  }

  return {
    business: {
      id: businessData.id,
      name: businessData.name,
      website: businessData.website,
      industry: businessData.industry,
      description: businessData.description,
      targetAudience: businessData.target_audience,
      valueProposition: businessData.value_proposition,
    },
    product,
    competitors,
    existingKeywords: [],
  };
}

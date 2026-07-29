import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  KEYWORD_RESEARCH_CONTRACT_VERSION,
  KEYWORD_RESEARCH_JOB_TYPE,
  type KeywordBusinessSnapshot,
  type KeywordProductSnapshot,
  type KeywordResearchJob,
  type KeywordSourceMode,
} from "@/lib/keyword-intelligence/types";
import { enqueueKeywordResearch } from "@/lib/server/mns";
import { createAdminClient } from "@/utils/supabase/admin";

export type KeywordBusinessRow = KeywordBusinessSnapshot & {
  id: string;
};

export type KeywordProductRow = {
  id: string;
  product_name: string;
  category: string | null;
  price: string | number | null;
  value_prop: string | null;
  target_sub_demographic: string | null;
  key_features: string[] | null;
  creative_hooks: string[] | null;
};

function productSnapshot(
  product: KeywordProductRow | null,
): KeywordProductSnapshot | null {
  if (!product) return null;
  return {
    id: product.id,
    product_name: product.product_name,
    category: product.category,
    price:
      product.price === null || product.price === ""
        ? null
        : String(product.price),
    value_prop: product.value_prop,
    target_sub_demographic: product.target_sub_demographic,
    key_features: product.key_features ?? [],
    creative_hooks: product.creative_hooks ?? [],
  };
}

function businessSnapshot(
  business: KeywordBusinessRow,
): KeywordBusinessSnapshot {
  return {
    name: business.name,
    website: business.website,
    industry: business.industry,
    description: business.description,
    target_audience: business.target_audience,
    brand_voice: business.brand_voice,
    value_proposition: business.value_proposition,
    competitors: business.competitors,
    markets: business.markets,
    campaign_goal: business.campaign_goal,
    price_range: business.price_range,
    target_keywords: business.target_keywords,
  };
}

export async function createAndEnqueueKeywordRun({
  business,
  product,
  sourceMode,
  sourceUrl,
}: {
  business: KeywordBusinessRow;
  product: KeywordProductRow | null;
  sourceMode: KeywordSourceMode;
  sourceUrl: string | null;
}): Promise<{ runId: string; status: "queued"; existing: boolean }> {
  const admin = createAdminClient();
  const { data: active, error: activeError } = await admin
    .from("keyword_research_runs")
    .select("id")
    .eq("business_id", business.id)
    .in("status", ["queued", "running"])
    .maybeSingle();
  if (activeError) throw new Error(activeError.message);
  if (active) {
    return { runId: active.id, status: "queued", existing: true };
  }

  const businessInput = businessSnapshot(business);
  const productInput = productSnapshot(product);
  const { data: run, error: runError } = await admin
    .from("keyword_research_runs")
    .insert({
      business_id: business.id,
      product_id: productInput?.id ?? null,
      source_mode: sourceMode,
      source_url: sourceUrl,
      status: "queued",
      stage: "queued",
      input_snapshot: {
        source_mode: sourceMode,
        source_url: sourceUrl,
        business: businessInput,
        product: productInput,
      },
    })
    .select("id")
    .single();

  if (runError?.code === "23505") {
    const { data: concurrent } = await admin
      .from("keyword_research_runs")
      .select("id")
      .eq("business_id", business.id)
      .in("status", ["queued", "running"])
      .maybeSingle();
    if (concurrent) {
      return { runId: concurrent.id, status: "queued", existing: true };
    }
  }
  if (runError || !run) {
    throw new Error(runError?.message ?? "Could not create keyword research.");
  }

  const job: KeywordResearchJob = {
    version: KEYWORD_RESEARCH_CONTRACT_VERSION,
    job_type: KEYWORD_RESEARCH_JOB_TYPE,
    run_id: run.id,
    business_id: business.id,
    source_mode: sourceMode,
    source_url: sourceUrl,
    business: businessInput,
    product: productInput,
  };
  try {
    await enqueueKeywordResearch(job);
  } catch (error) {
    await markKeywordRunFailed(
      admin,
      run.id,
      "queue_unavailable",
      "Keyword research could not be queued. Try again shortly.",
    );
    throw error;
  }

  return { runId: run.id, status: "queued", existing: false };
}

export async function markKeywordRunFailed(
  admin: SupabaseClient,
  runId: string,
  code: string,
  message: string,
) {
  const now = new Date().toISOString();
  await admin
    .from("keyword_research_runs")
    .update({
      status: "failed",
      stage: "failed",
      error_code: code.slice(0, 100),
      error_message: message.slice(0, 500),
      completed_at: now,
      updated_at: now,
    })
    .eq("id", runId)
    .in("status", ["queued", "running"]);
}

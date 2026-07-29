import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { RESEARCH_CONTRACT_VERSION, type BusinessResearchSnapshot, type CompetitorResearchJob, type ResearchTrigger } from "@/lib/competitor-intelligence/types";
import { enqueueCompetitorResearch } from "@/lib/server/mns";
import { queuePositionFromAheadCounts } from "@/lib/queue-position";
import { createAdminClient } from "@/utils/supabase/admin";

type BusinessRow = BusinessResearchSnapshot & {
  id: string;
};

type ActiveResearchRun = {
  runId: string;
  status: "queued" | "running";
  existing: boolean;
};

export async function createAndEnqueueResearchRun(
  business: BusinessRow,
  trigger: ResearchTrigger,
): Promise<ActiveResearchRun> {
  const admin = createAdminClient();

  const { data: active, error: activeError } = await admin
    .from("competitor_research_runs")
    .select("id, status")
    .eq("business_id", business.id)
    .in("status", ["queued", "running"])
    .maybeSingle();
  if (activeError) throw new Error(activeError.message);
  if (active) {
    return {
      runId: active.id,
      status: active.status === "running" ? "running" : "queued",
      existing: true,
    };
  }

  const snapshot: BusinessResearchSnapshot = {
    name: business.name,
    website: business.website,
    industry: business.industry,
    description: business.description,
    target_audience: business.target_audience,
    value_proposition: business.value_proposition,
    markets: business.markets,
    target_keywords: business.target_keywords,
  };

  const { data: tracked, error: trackedError } = await admin
    .from("competitors")
    .select("id, name, website_url, primary_angle")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });
  if (trackedError) throw new Error(trackedError.message);

  const { data: run, error: runError } = await admin
    .from("competitor_research_runs")
    .insert({
      business_id: business.id,
      trigger,
      status: "queued",
      stage: "queued",
      input_snapshot: snapshot,
    })
    .select("id")
    .single();

  if (runError?.code === "23505") {
    const { data: concurrent } = await admin
      .from("competitor_research_runs")
      .select("id, status")
      .eq("business_id", business.id)
      .in("status", ["queued", "running"])
      .maybeSingle();
    if (concurrent) {
      return {
        runId: concurrent.id,
        status: concurrent.status === "running" ? "running" : "queued",
        existing: true,
      };
    }
  }
  if (runError || !run) {
    throw new Error(runError?.message ?? "Could not create research run.");
  }

  const job: CompetitorResearchJob = {
    version: RESEARCH_CONTRACT_VERSION,
    run_id: run.id,
    business_id: business.id,
    trigger,
    business: snapshot,
    tracked_competitors: (tracked ?? []).map((competitor) => ({
      id: competitor.id,
      name: competitor.name,
      website_url: competitor.website_url,
      primary_angle: competitor.primary_angle,
    })),
  };

  try {
    await enqueueCompetitorResearch(job);
  } catch (error) {
    await markRunFailed(
      admin,
      run.id,
      "queue_unavailable",
      "Research could not be queued. Try again shortly.",
    );
    throw error;
  }

  return { runId: run.id, status: "queued", existing: false };
}

export async function getResearchQueuePosition(
  runId: string,
  queuedAt: string,
): Promise<number | null> {
  const admin = createAdminClient();
  const [earlier, sameTime, current] = await Promise.all([
    admin
      .from("competitor_research_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .lt("queued_at", queuedAt),
    admin
      .from("competitor_research_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .eq("queued_at", queuedAt)
      .lt("id", runId),
    admin
      .from("competitor_research_runs")
      .select("status")
      .eq("id", runId)
      .maybeSingle(),
  ]);
  if (earlier.error || sameTime.error || current.error) {
    throw new Error(
      earlier.error?.message ??
        sameTime.error?.message ??
        current.error?.message ??
        "Could not load research queue position.",
    );
  }
  if (current.data?.status !== "queued") return null;
  return queuePositionFromAheadCounts(
    earlier.count ?? 0,
    sameTime.count ?? 0,
  );
}

export async function markRunFailed(
  admin: SupabaseClient,
  runId: string,
  code: string,
  message: string,
) {
  const now = new Date().toISOString();
  await admin
    .from("competitor_research_runs")
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

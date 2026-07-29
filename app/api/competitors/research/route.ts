import { createAndEnqueueResearchRun } from "@/lib/server/competitor-research";
import type {
  MonitorSettingsDto,
  ResearchCandidateDto,
  ResearchRunDto,
} from "@/lib/competitor-intelligence/types";
import { isJsonObject, isUuid, stringValue } from "@/lib/validation";
import { getApiAuth } from "@/utils/api-auth";

export const runtime = "nodejs";

const businessSelect =
  "id, name, website, industry, description, target_audience, value_proposition, markets, target_keywords";

async function ownedBusiness(businessId: string) {
  const auth = await getApiAuth();
  if (!auth) return { error: "Sign in to research competitors.", status: 401 as const };

  const { data, error } = await auth.supabase
    .from("businesses")
    .select(businessSelect)
    .eq("id", businessId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (error) return { error: "Could not load the business.", status: 500 as const };
  if (!data) return { error: "Business not found.", status: 404 as const };
  return { auth, business: data };
}

export async function POST(request: Request) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const businessId =
    isJsonObject(value) ? stringValue(value.businessId, 100) : null;
  if (!businessId || !isUuid(businessId)) {
    return Response.json({ error: "A valid businessId is required." }, { status: 400 });
  }

  const owned = await ownedBusiness(businessId);
  if ("error" in owned) {
    return Response.json({ error: owned.error }, { status: owned.status });
  }

  try {
    const queued = await createAndEnqueueResearchRun(owned.business, "manual");
    return Response.json(
      { runId: queued.runId, status: queued.status, existing: queued.existing },
      { status: 202 },
    );
  } catch {
    return Response.json(
      { error: "Competitor research could not be queued. Try again shortly." },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!isUuid(businessId)) {
    return Response.json({ error: "A valid businessId is required." }, { status: 400 });
  }
  const owned = await ownedBusiness(businessId);
  if ("error" in owned) {
    return Response.json({ error: owned.error }, { status: owned.status });
  }
  const { supabase } = owned.auth;

  const [{ data: run, error: runError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase
        .from("competitor_research_runs")
        .select(
          "id, business_id, trigger, status, stage, model_id, source_count, error_code, error_message, queued_at, started_at, completed_at",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("competitor_monitor_settings")
        .select(
          "business_id, enabled, cadence, local_time, timezone, min_alert_score, notify_in_app, next_run_at",
        )
        .eq("business_id", businessId)
        .maybeSingle(),
    ]);
  if (runError || settingsError) {
    return Response.json(
      { error: "Could not load competitor research." },
      { status: 500 },
    );
  }

  let runDto: ResearchRunDto | null = null;
  if (run) {
    const { data: candidates, error: candidateError } = await supabase
      .from("competitor_candidates")
      .select(
        "id, name, website_url, normalized_domain, relationship, threat_score, confidence, threat_horizon, why_competitor, why_now, customer_overlap, product_substitutability, momentum, distribution_overlap, evidence_quality, rank",
      )
      .eq("run_id", run.id)
      .order("rank", { ascending: true });
    if (candidateError) {
      return Response.json(
        { error: "Could not load competitor candidates." },
        { status: 500 },
      );
    }

    const candidateIds = (candidates ?? []).map((candidate) => candidate.id);
    const evidenceByCandidate = new Map<string, unknown[]>();
    if (candidateIds.length > 0) {
      const { data: evidence, error: evidenceError } = await supabase
        .from("competitor_evidence")
        .select(
          "id, candidate_id, source_url, source_domain, title, source_type, claim, excerpt, published_at, observed_at, content_hash",
        )
        .in("candidate_id", candidateIds)
        .order("observed_at", { ascending: false });
      if (evidenceError) {
        return Response.json(
          { error: "Could not load research evidence." },
          { status: 500 },
        );
      }
      for (const item of evidence ?? []) {
        const list = evidenceByCandidate.get(item.candidate_id) ?? [];
        list.push(item);
        evidenceByCandidate.set(item.candidate_id, list);
      }
    }

    runDto = {
      ...run,
      candidates: (candidates ?? []).map((candidate) => ({
        ...candidate,
        evidence: evidenceByCandidate.get(candidate.id) ?? [],
      })) as ResearchCandidateDto[],
    } as ResearchRunDto;
  }

  const defaultSettings: MonitorSettingsDto = {
    business_id: businessId,
    enabled: false,
    cadence: "daily",
    local_time: "08:00:00",
    timezone: "America/Los_Angeles",
    min_alert_score: 70,
    notify_in_app: true,
    next_run_at: null,
  };

  return Response.json(
    { run: runDto, settings: (settings ?? defaultSettings) as MonitorSettingsDto },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

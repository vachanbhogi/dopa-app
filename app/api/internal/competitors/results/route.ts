import { parseResearchResult } from "@/lib/competitor-intelligence/validation";
import { severityForScore } from "@/lib/competitor-intelligence/scoring";
import { readVerifiedInternalJson } from "@/lib/server/internal-auth";
import { sendBusinessPush } from "@/lib/server/push";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Server configuration is incomplete." }, { status: 503 });
  }
  const verified = await readVerifiedInternalJson(request, admin);
  if (!verified.ok) return verified.response;
  const result = parseResearchResult(verified.value);
  if (!result) {
    return Response.json({ error: "Invalid research result." }, { status: 400 });
  }

  const { data: run, error: runError } = await admin
    .from("competitor_research_runs")
    .select("id, business_id, status")
    .eq("id", result.run_id)
    .maybeSingle();
  if (runError) {
    return Response.json({ error: "Could not load the research run." }, { status: 500 });
  }
  if (!run) {
    return Response.json({ error: "Research run not found." }, { status: 404 });
  }
  if (run.status === "completed") {
    return Response.json({ success: true, idempotent: true });
  }

  const { data: tracked, error: trackedError } = await admin
    .from("competitors")
    .select("id")
    .eq("business_id", run.business_id);
  if (trackedError) {
    return Response.json({ error: "Could not validate tracked competitors." }, { status: 500 });
  }
  const trackedIds = new Set((tracked ?? []).map((item) => item.id));

  const signalRows = result.signals
    .filter((signal) => trackedIds.has(signal.tracked_competitor_id))
    .map((signal) => ({
      competitor_id: signal.tracked_competitor_id,
      business_id: run.business_id,
      research_run_id: run.id,
      move_type: signal.move_type,
      title: signal.title,
      description: signal.description,
      risk_level: signal.risk_level,
      source_url: signal.source_url,
      source_title: signal.source_title,
      signal_date: signal.signal_date,
      observed_at: signal.observed_at,
      confidence: signal.confidence,
      dedupe_key: signal.dedupe_key,
    }));

  const { data: settings } = await admin
    .from("competitor_monitor_settings")
    .select("min_alert_score, notify_in_app, notify_browser")
    .eq("business_id", run.business_id)
    .maybeSingle();
  const minimum = settings?.min_alert_score ?? 70;
  const notificationsEnabled =
    (settings?.notify_in_app ?? true) || (settings?.notify_browser ?? false);

  const alertRows: Array<Record<string, unknown>> = [];
  if (notificationsEnabled) {
    for (const candidate of result.candidates.filter(
      (item) => item.threat_score >= minimum,
    )) {
      const scoredSeverity = severityForScore(candidate.threat_score);
      const { data: previous } = await admin
        .from("competitor_candidates")
        .select("threat_score")
        .eq("business_id", run.business_id)
        .eq("normalized_domain", candidate.normalized_domain)
        .neq("run_id", run.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (previous && candidate.threat_score < previous.threat_score + 10) {
        continue;
      }
      alertRows.push({
        candidate_domain: candidate.normalized_domain,
        kind: previous ? "threat_increase" : "new_competitor",
        severity:
          scoredSeverity === "high" && candidate.confidence < 70
            ? "medium"
            : scoredSeverity,
        title: previous
          ? `${candidate.name} is becoming more relevant`
          : `${candidate.name} entered the watchlist`,
        body: candidate.why_now,
        dedupe_key: `${run.id}:${candidate.normalized_domain}:candidate`,
      });
    }
    for (const signal of signalRows) {
      alertRows.push({
        kind: "new_signal",
        severity: signal.risk_level,
        title: signal.title,
        body: signal.description,
        dedupe_key: `${run.id}:${signal.dedupe_key}:signal`,
      });
    }
  }

  const { data: completion, error: completionError } = await admin.rpc(
    "complete_competitor_research",
    {
      p_run_id: run.id,
      p_model_id: result.model_id,
      p_provider_request_id: result.provider_request_id,
      p_source_count: result.source_count,
      p_completed_at: result.completed_at,
      p_candidates: result.candidates,
      p_signals: signalRows,
      p_alerts: alertRows,
    },
  );
  if (completionError) {
    return Response.json(
      { error: "Could not atomically persist the research report." },
      { status: 500 },
    );
  }
  const alertIds =
    completion &&
    typeof completion === "object" &&
    "alert_ids" in completion &&
    Array.isArray(completion.alert_ids)
      ? completion.alert_ids.filter(
          (value: unknown): value is string => typeof value === "string",
        )
      : [];
  const wasIdempotent =
    completion &&
    typeof completion === "object" &&
    "idempotent" in completion &&
    completion.idempotent === true;

  if (alertRows.length > 0 && !wasIdempotent) {
    const top = result.candidates[0];
    await sendBusinessPush(
      run.business_id,
      {
        title: `Dopa found ${result.candidates.length} researched competitor${result.candidates.length === 1 ? "" : "s"}`,
        body: top
          ? `${top.name} leads the list at ${top.threat_score}/100.`
          : "New sourced competitor activity is ready to review.",
        url: "/dashboard?tab=competitors",
      },
      alertIds,
    );
  }

  return Response.json({
    success: true,
    candidates: result.candidates.length,
    signals: signalRows.length,
  });
}

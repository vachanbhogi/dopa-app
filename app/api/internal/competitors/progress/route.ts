import { RESEARCH_CONTRACT_VERSION } from "@/lib/competitor-intelligence/types";
import { isJsonObject, isUuid, stringValue } from "@/lib/validation";
import { readVerifiedInternalJson } from "@/lib/server/internal-auth";
import { sendBusinessPush } from "@/lib/server/push";
import { createAdminClient } from "@/utils/supabase/admin";

const runningStages = new Set(["searching", "synthesizing", "finalizing"]);

export async function POST(request: Request) {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Server configuration is incomplete." }, { status: 503 });
  }
  const verified = await readVerifiedInternalJson(request, admin, 64 * 1024);
  if (!verified.ok) return verified.response;
  const value = verified.value;
  if (!isJsonObject(value) || value.version !== RESEARCH_CONTRACT_VERSION) {
    return Response.json({ error: "Unsupported progress payload." }, { status: 400 });
  }

  const runId = stringValue(value.run_id, 100);
  const workerId = stringValue(value.worker_id, 200);
  const stage = stringValue(value.stage, 40);
  if (
    !runId ||
    !isUuid(runId) ||
    !workerId ||
    (!runningStages.has(stage ?? "") && stage !== "failed")
  ) {
    return Response.json({ error: "Invalid progress payload." }, { status: 400 });
  }

  const { data: run, error: runError } = await admin
    .from("competitor_research_runs")
    .select("id, business_id, status, started_at")
    .eq("id", runId)
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

  const now = new Date().toISOString();
  const isFailure = stage === "failed";
  const errorCode = isFailure
    ? stringValue(value.error_code, 100) ?? "worker_failed"
    : null;
  const errorMessage = isFailure
    ? stringValue(value.error_message, 500) ?? "Competitor research failed."
    : null;
  const { error } = await admin
    .from("competitor_research_runs")
    .update({
      status: isFailure ? "failed" : "running",
      stage,
      started_at: isFailure ? run.started_at : (run.started_at ?? now),
      completed_at: isFailure ? now : null,
      error_code: errorCode,
      error_message: errorMessage,
      updated_at: now,
    })
    .eq("id", runId)
    .neq("status", "completed");
  if (error) {
    return Response.json({ error: "Could not update research progress." }, { status: 500 });
  }

  if (isFailure) {
    const dedupeKey = `${runId}:research_failed`;
    const { data: alert } = await admin
      .from("competitor_alerts")
      .upsert(
        {
          business_id: run.business_id,
          run_id: runId,
          kind: "research_failed",
          severity: "medium",
          title: "Competitor research needs attention",
          body: errorMessage,
          dedupe_key: dedupeKey,
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    await sendBusinessPush(
      run.business_id,
      {
        title: "Dopa competitor research needs attention",
        body: errorMessage ?? "Competitor research failed.",
        url: "/dashboard?tab=competitors",
      },
      alert ? [alert.id] : [],
    );
  }

  return Response.json({ success: true });
}

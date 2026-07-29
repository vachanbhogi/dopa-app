import {
  KEYWORD_RESEARCH_CONTRACT_VERSION,
  KEYWORD_RESEARCH_JOB_TYPE,
} from "@/lib/keyword-intelligence/types";
import { readVerifiedInternalJson } from "@/lib/server/internal-auth";
import { isJsonObject, isUuid, stringValue } from "@/lib/validation";
import { createAdminClient } from "@/utils/supabase/admin";

const runningStages = new Set(["searching", "synthesizing", "finalizing"]);

export async function POST(request: Request) {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json(
      { error: "Server configuration is incomplete." },
      { status: 503 },
    );
  }
  const verified = await readVerifiedInternalJson(request, admin, 64 * 1024);
  if (!verified.ok) return verified.response;
  const value = verified.value;
  if (
    !isJsonObject(value) ||
    value.version !== KEYWORD_RESEARCH_CONTRACT_VERSION ||
    value.job_type !== KEYWORD_RESEARCH_JOB_TYPE
  ) {
    return Response.json(
      { error: "Unsupported progress payload." },
      { status: 400 },
    );
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
    return Response.json(
      { error: "Invalid progress payload." },
      { status: 400 },
    );
  }

  const { data: run, error: runError } = await admin
    .from("keyword_research_runs")
    .select("id, status, started_at")
    .eq("id", runId)
    .maybeSingle();
  if (runError) {
    return Response.json(
      { error: "Could not load the keyword run." },
      { status: 500 },
    );
  }
  if (!run) {
    return Response.json(
      { error: "Keyword run not found." },
      { status: 404 },
    );
  }
  if (run.status === "completed") {
    return Response.json({ success: true, idempotent: true });
  }

  const now = new Date().toISOString();
  const isFailure = stage === "failed";
  const { error } = await admin
    .from("keyword_research_runs")
    .update({
      status: isFailure ? "failed" : "running",
      stage,
      started_at: isFailure ? run.started_at : (run.started_at ?? now),
      completed_at: isFailure ? now : null,
      error_code: isFailure
        ? stringValue(value.error_code, 100) ?? "worker_failed"
        : null,
      error_message: isFailure
        ? stringValue(value.error_message, 500) ?? "Keyword research failed."
        : null,
      updated_at: now,
    })
    .eq("id", runId)
    .neq("status", "completed");
  if (error) {
    return Response.json(
      { error: "Could not update keyword progress." },
      { status: 500 },
    );
  }
  return Response.json({ success: true });
}

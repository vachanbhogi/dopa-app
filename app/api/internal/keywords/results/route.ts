import { parseKeywordResearchResult } from "@/lib/keyword-intelligence/validation";
import { readVerifiedInternalJson } from "@/lib/server/internal-auth";
import { createAdminClient } from "@/utils/supabase/admin";

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
  const verified = await readVerifiedInternalJson(request, admin, 512 * 1024);
  if (!verified.ok) return verified.response;
  const result = parseKeywordResearchResult(verified.value);
  if (!result) {
    return Response.json(
      { error: "Invalid keyword research result." },
      { status: 400 },
    );
  }

  const { data: run, error: runError } = await admin
    .from("keyword_research_runs")
    .select("id, status")
    .eq("id", result.run_id)
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

  const { data: completed, error } = await admin
    .from("keyword_research_runs")
    .update({
      status: "completed",
      stage: "completed",
      model_id: result.model_id,
      provider_request_id: result.provider_request_id,
      source_count: result.source_count,
      recommendations: result.recommendations,
      usage: result.usage,
      completed_at: result.completed_at,
      error_code: null,
      error_message: null,
      updated_at: result.completed_at,
    })
    .eq("id", result.run_id)
    .neq("status", "completed")
    .select("id")
    .maybeSingle();
  if (error) {
    return Response.json(
      { error: "Could not persist keyword research." },
      { status: 500 },
    );
  }
  return Response.json({
    success: true,
    idempotent: completed === null,
    recommendations: result.recommendations.length,
  });
}

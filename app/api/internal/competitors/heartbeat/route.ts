import { RESEARCH_CONTRACT_VERSION } from "@/lib/competitor-intelligence/types";
import { isJsonObject, stringValue } from "@/lib/validation";
import { readVerifiedInternalJson } from "@/lib/server/internal-auth";
import { createAdminClient } from "@/utils/supabase/admin";

const statuses = new Set(["starting", "healthy", "degraded"]);

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
    return Response.json({ error: "Unsupported heartbeat payload." }, { status: 400 });
  }
  const workerId = stringValue(value.worker_id, 200);
  const status = stringValue(value.status, 40);
  const workerVersion = stringValue(value.worker_version, 100);
  const queueName = stringValue(value.queue_name, 200);
  const observedAt = stringValue(value.observed_at, 100);
  if (
    !workerId ||
    !status ||
    !statuses.has(status) ||
    !workerVersion ||
    !queueName ||
    !observedAt ||
    !Number.isFinite(Date.parse(observedAt))
  ) {
    return Response.json({ error: "Invalid heartbeat payload." }, { status: 400 });
  }

  const metadata = isJsonObject(value.metadata) ? value.metadata : {};
  const { error } = await admin.from("competitor_workers").upsert(
    {
      worker_id: workerId,
      status,
      version: workerVersion,
      queue_name: queueName,
      metadata,
      last_seen_at: new Date(observedAt).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "worker_id" },
  );
  if (error) {
    return Response.json({ error: "Could not record worker heartbeat." }, { status: 500 });
  }
  return Response.json({ success: true });
}

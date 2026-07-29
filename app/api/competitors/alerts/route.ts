import { isJsonObject, isUuid, stringValue } from "@/lib/validation";
import { getApiAuth } from "@/utils/api-auth";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(request: Request) {
  const auth = await getApiAuth();
  if (!auth) {
    return Response.json({ error: "Sign in to view alerts." }, { status: 401 });
  }
  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!isUuid(businessId)) {
    return Response.json({ error: "A valid businessId is required." }, { status: 400 });
  }

  const { data: settings } = await auth.supabase
    .from("competitor_monitor_settings")
    .select("notify_in_app")
    .eq("business_id", businessId)
    .maybeSingle();
  if (settings && !settings.notify_in_app) {
    return Response.json({ alerts: [] });
  }

  const { data, error } = await auth.supabase
    .from("competitor_alerts")
    .select(
      "id, business_id, run_id, candidate_id, kind, severity, title, body, read_at, created_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    return Response.json({ error: "Could not load alerts." }, { status: 500 });
  }
  return Response.json({ alerts: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const auth = await getApiAuth();
  if (!auth) {
    return Response.json({ error: "Sign in to update alerts." }, { status: 401 });
  }
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const alertId = isJsonObject(value) ? stringValue(value.alertId, 100) : null;
  if (!alertId || !isUuid(alertId)) {
    return Response.json({ error: "A valid alertId is required." }, { status: 400 });
  }

  const { data: visible, error: visibleError } = await auth.supabase
    .from("competitor_alerts")
    .select("id")
    .eq("id", alertId)
    .maybeSingle();
  if (visibleError) {
    return Response.json({ error: "Could not validate the alert." }, { status: 500 });
  }
  if (!visible) {
    return Response.json({ error: "Alert not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("competitor_alerts")
    .update({ read_at: new Date().toISOString() })
    .eq("id", alertId);
  if (error) {
    return Response.json({ error: "Could not update the alert." }, { status: 500 });
  }
  return Response.json({ success: true });
}

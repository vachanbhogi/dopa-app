import { nextDailyRun, normalizeLocalTime, isValidTimeZone } from "@/lib/competitor-intelligence/schedule";
import { isJsonObject, isUuid, stringValue } from "@/lib/validation";
import { getApiAuth } from "@/utils/api-auth";

export async function PATCH(request: Request) {
  const auth = await getApiAuth();
  if (!auth) {
    return Response.json({ error: "Sign in to update monitoring." }, { status: 401 });
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!isJsonObject(value)) {
    return Response.json({ error: "Settings are required." }, { status: 400 });
  }

  const businessId = stringValue(value.businessId, 100);
  const localTime =
    typeof value.localTime === "string"
      ? normalizeLocalTime(value.localTime)
      : null;
  const timezone = stringValue(value.timezone, 100);
  const minimum = Number(value.minAlertScore);
  if (
    !businessId ||
    !isUuid(businessId) ||
    !localTime ||
    !timezone ||
    !isValidTimeZone(timezone) ||
    !Number.isInteger(minimum) ||
    minimum < 0 ||
    minimum > 100 ||
    typeof value.enabled !== "boolean" ||
    typeof value.notifyInApp !== "boolean" ||
    typeof value.notifyBrowser !== "boolean"
  ) {
    return Response.json({ error: "Invalid monitor settings." }, { status: 400 });
  }

  const { data: business, error: businessError } = await auth.supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (businessError) {
    return Response.json({ error: "Could not validate the business." }, { status: 500 });
  }
  if (!business) {
    return Response.json({ error: "Business not found." }, { status: 404 });
  }

  const nextRunAt = value.enabled
    ? nextDailyRun(timezone, localTime).toISOString()
    : null;
  const now = new Date().toISOString();
  const { data, error } = await auth.supabase
    .from("competitor_monitor_settings")
    .upsert(
      {
        business_id: businessId,
        enabled: value.enabled,
        cadence: "daily",
        local_time: localTime,
        timezone,
        min_alert_score: minimum,
        notify_in_app: value.notifyInApp,
        notify_browser: value.notifyBrowser,
        next_run_at: nextRunAt,
        updated_at: now,
      },
      { onConflict: "business_id" },
    )
    .select(
      "business_id, enabled, cadence, local_time, timezone, min_alert_score, notify_in_app, notify_browser, next_run_at",
    )
    .single();
  if (error) {
    return Response.json({ error: "Could not save monitoring settings." }, { status: 500 });
  }
  return Response.json({ settings: data });
}

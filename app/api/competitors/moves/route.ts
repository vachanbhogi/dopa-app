import { isUuid } from "@/lib/validation";
import { getApiAuth } from "@/utils/api-auth";

export async function GET(request: Request) {
  const auth = await getApiAuth();
  if (!auth) {
    return Response.json({ error: "Sign in to view competitor signals." }, { status: 401 });
  }
  const competitorId = new URL(request.url).searchParams.get("competitorId");
  if (!isUuid(competitorId)) {
    return Response.json({ error: "A valid competitorId is required." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("competitor_moves")
    .select(
      "id, competitor_id, move_type, title, description, risk_level, source_url, source_title, signal_date, observed_at, confidence",
    )
    .eq("competitor_id", competitorId)
    .order("observed_at", { ascending: false })
    .limit(50);
  if (error) {
    return Response.json({ error: "Could not load competitor signals." }, { status: 500 });
  }
  return Response.json({ signals: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

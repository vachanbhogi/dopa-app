import { reapExpiredFcRuns } from "@/lib/fc-sandbox/service";
import { isCronAuthorized } from "@/utils/cron-security";
import { NO_STORE_HEADERS } from "@/utils/http-security";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (
    !isCronAuthorized(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json(
      { error: "Unauthorized." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }
  try {
    return Response.json(await reapExpiredFcRuns(), {
      headers: NO_STORE_HEADERS,
    });
  } catch {
    return Response.json(
      { error: "Expired-run maintenance failed safely." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

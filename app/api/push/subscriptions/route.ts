import { isJsonObject, stringValue } from "@/lib/validation";
import { getApiAuth } from "@/utils/api-auth";
import { createAdminClient } from "@/utils/supabase/admin";

function subscriptionFrom(value: unknown) {
  if (!isJsonObject(value)) return null;
  const endpoint = stringValue(value.endpoint, 4_096);
  const keys = isJsonObject(value.keys) ? value.keys : null;
  const p256dh = keys ? stringValue(keys.p256dh, 1_000) : null;
  const auth = keys ? stringValue(keys.auth, 1_000) : null;
  if (!endpoint || !p256dh || !auth) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { endpoint, p256dh, auth };
}

export async function GET() {
  if (!(await getApiAuth())) {
    return Response.json({ error: "Sign in to configure push." }, { status: 401 });
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return Response.json(
      { error: "Browser notifications are not configured." },
      { status: 503 },
    );
  }
  return Response.json({ publicKey });
}

export async function POST(request: Request) {
  const authState = await getApiAuth();
  if (!authState) {
    return Response.json({ error: "Sign in to configure push." }, { status: 401 });
  }
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const subscription = subscriptionFrom(value);
  if (!subscription) {
    return Response.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: authState.user.id,
      ...subscription,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    return Response.json({ error: "Could not save push subscription." }, { status: 500 });
  }
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  const authState = await getApiAuth();
  if (!authState) {
    return Response.json({ error: "Sign in to configure push." }, { status: 401 });
  }
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const endpoint = isJsonObject(value) ? stringValue(value.endpoint, 4_096) : null;
  if (!endpoint) {
    return Response.json({ error: "endpoint is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", authState.user.id)
    .eq("endpoint", endpoint);
  if (error) {
    return Response.json({ error: "Could not remove push subscription." }, { status: 500 });
  }
  return Response.json({ success: true });
}

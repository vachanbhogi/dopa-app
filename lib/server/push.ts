import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";

type PushMessage = {
  title: string;
  body: string;
  url: string;
};

function configureWebPush(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendBusinessPush(
  businessId: string,
  message: PushMessage,
  alertIds: string[] = [],
): Promise<void> {
  if (!configureWebPush()) return;
  const admin = createAdminClient();

  const [{ data: settings }, { data: business }] = await Promise.all([
    admin
      .from("competitor_monitor_settings")
      .select("notify_browser")
      .eq("business_id", businessId)
      .maybeSingle(),
    admin
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .maybeSingle(),
  ]);
  if (!settings?.notify_browser || !business?.owner_id) return;

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", business.owner_id);
  if (!subscriptions?.length) return;

  let sent = false;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(message),
          { TTL: 60 * 60 },
        );
        sent = true;
      } catch (error: unknown) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }
      }
    }),
  );

  if (sent && alertIds.length > 0) {
    await admin
      .from("competitor_alerts")
      .update({ push_sent_at: new Date().toISOString() })
      .in("id", alertIds);
  }
}

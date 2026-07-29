import { NextResponse } from "next/server";
import {
  fetchKeywordMetrics,
  type GoogleAdsCredentials,
} from "@/utils/google-ads-client";
import { getApiAuth } from "@/utils/api-auth";
import { enforceApiQuota } from "@/utils/api-quota";
import { readJsonObjectRequest } from "@/utils/http-security";
import { getGoogleAdsSession } from "@/utils/google-ads-session";
import {
  GOOGLE_ADS_TOKEN_COOKIE,
  GOOGLE_ADS_TOKEN_MAX_AGE_SECONDS,
} from "@/utils/google-ads-token";
import { stringValue } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await readJsonObjectRequest(request, 16_384);
  if (!parsed.success) return parsed.response;
  const auth = await getApiAuth();
  if (!auth) {
    return NextResponse.json(
      { error: "Sign in to load keyword metrics." },
      { status: 401 },
    );
  }
  const quota = await enforceApiQuota(auth.supabase, "google_ads_read");
  if (quota) return quota;

  const keywords = Array.isArray(parsed.data.keywords)
    ? parsed.data.keywords
        .flatMap((value) => {
          const keyword = stringValue(value, 120);
          return keyword ? [keyword] : [];
        })
        .filter(
          (keyword, index, list) =>
            list.findIndex(
              (other) =>
                other.toLocaleLowerCase() === keyword.toLocaleLowerCase(),
            ) === index,
        )
        .slice(0, 12)
    : [];
  if (keywords.length === 0) {
    return NextResponse.json(
      { error: "At least one keyword is required." },
      { status: 400 },
    );
  }

  const googleAdsSession = await getGoogleAdsSession(
    auth.cookieStore,
    auth.user.id,
  );
  const credentials: GoogleAdsCredentials = {
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID ?? "",
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    accessToken: googleAdsSession.accessToken,
  };
  const metrics = await fetchKeywordMetrics(credentials, keywords);
  const response = NextResponse.json({
    connected: Boolean(
      googleAdsSession.accessToken &&
        credentials.customerId &&
        credentials.developerToken,
    ),
    metrics,
  });
  if (googleAdsSession.clearCookie) {
    response.cookies.delete(GOOGLE_ADS_TOKEN_COOKIE);
  } else if (googleAdsSession.refreshedCookie) {
    response.cookies.set(
      GOOGLE_ADS_TOKEN_COOKIE,
      googleAdsSession.refreshedCookie,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GOOGLE_ADS_TOKEN_MAX_AGE_SECONDS,
      },
    );
  }
  return response;
}

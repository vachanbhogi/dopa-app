import { NextRequest, NextResponse } from "next/server";
import { fetchLiveGoogleAdsData, GoogleAdsCredentials } from "@/utils/google-ads-client";

export async function GET(req: NextRequest) {
  // Read credentials from environment variables first if available
  const envCreds: GoogleAdsCredentials = {
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || "",
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || "",
  };

  if (!envCreds.customerId || !envCreds.developerToken) {
    return NextResponse.json({
      success: false,
      configured: false,
      source: "demo_fallback",
      message: "Google Ads API environment variables (GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN) not set. Providing setup instructions & live test tool.",
      requiredEnvVars: [
        "GOOGLE_ADS_CUSTOMER_ID",
        "GOOGLE_ADS_DEVELOPER_TOKEN",
        "GOOGLE_ADS_CLIENT_ID",
        "GOOGLE_ADS_CLIENT_SECRET",
        "GOOGLE_ADS_REFRESH_TOKEN"
      ]
    });
  }

  const result = await fetchLiveGoogleAdsData(envCreds);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const creds: GoogleAdsCredentials = {
      customerId: body.customerId || "",
      developerToken: body.developerToken || "",
      clientId: body.clientId || "",
      clientSecret: body.clientSecret || "",
      refreshToken: body.refreshToken || "",
      accessToken: body.accessToken || "",
    };

    if (!creds.customerId || !creds.developerToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer ID and Developer Token are required to connect to Google Ads API.",
        },
        { status: 400 }
      );
    }

    const result = await fetchLiveGoogleAdsData(creds);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Invalid Request Body or Network Error: ${msg}` },
      { status: 500 }
    );
  }
}

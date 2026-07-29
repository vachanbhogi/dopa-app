import { NextResponse } from "next/server";
import {
  DiscoveryError,
  discoverBusinessFromWebsite,
  type BusinessDiscoveryProfile,
} from "@/lib/business-discovery";
import { errorMessage, stringValue } from "@/lib/validation";
import { enforceApiQuota } from "@/utils/api-quota";
import { getApiAuth } from "@/utils/api-auth";
import { readJsonObjectRequest } from "@/utils/http-security";

export type { BusinessDiscoveryProfile };

export async function POST(req: Request) {
  try {
    const parsedRequest = await readJsonObjectRequest(req, 4_096);
    if (!parsedRequest.success) return parsedRequest.response;

    const auth = await getApiAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Sign in before scanning a website." },
        { status: 401 },
      );
    }

    const quotaResponse = await enforceApiQuota(
      auth.supabase,
      "business_auto_discover",
    );
    if (quotaResponse) return quotaResponse;

    const websiteUrl = stringValue(parsedRequest.data.websiteUrl, 2_048);

    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Website URL is required." },
        { status: 400 },
      );
    }

    const result = await discoverBusinessFromWebsite(websiteUrl);
    return NextResponse.json({
      success: true,
      profile: result.profile,
      websiteUrl: result.websiteUrl,
    });
  } catch (error: unknown) {
    if (error instanceof DiscoveryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Business discovery failed.", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        error: errorMessage(
          error,
          "Failed to auto-discover business profile.",
        ),
      },
      { status: 500 },
    );
  }
}

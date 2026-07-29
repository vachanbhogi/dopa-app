import { NextResponse } from "next/server";
import {
  DiscoveryError,
  discoverBusinessFromWebsite,
} from "@/lib/business-discovery";
import {
  ALIBABA_DEMO_URL,
  alibabaDemoProfile,
} from "@/lib/demo/alibaba-profile";
import { errorMessage, stringValue } from "@/lib/validation";
import { NO_STORE_HEADERS, readJsonObjectRequest } from "@/utils/http-security";

const recentByIp = new Map<string, { count: number; resetAt: number }>();
const DEMO_LIMIT = 8;
const DEMO_WINDOW_MS = 60 * 60 * 1000;

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function allowDemoRequest(ip: string): boolean {
  const now = Date.now();
  const entry = recentByIp.get(ip);
  if (!entry || entry.resetAt <= now) {
    recentByIp.set(ip, { count: 1, resetAt: now + DEMO_WINDOW_MS });
    return true;
  }
  if (entry.count >= DEMO_LIMIT) return false;
  entry.count += 1;
  return true;
}

function looksLikeAlibaba(url: string): boolean {
  try {
    const host = new URL(url.includes("://") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
    return host === "alibaba.com" || host.endsWith(".alibaba.com");
  } catch {
    return /alibaba\.com/i.test(url);
  }
}

/** Public, rate-limited discovery for the account-free /demo onboarding flow. */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!allowDemoRequest(ip)) {
      return NextResponse.json(
        { error: "Too many demo scans. Try again later or sign up." },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, "Retry-After": "3600" },
        },
      );
    }

    const parsedRequest = await readJsonObjectRequest(req, 4_096);
    if (!parsedRequest.success) return parsedRequest.response;

    const websiteUrl = stringValue(parsedRequest.data.websiteUrl, 2_048);
    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Website URL is required." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    try {
      const result = await discoverBusinessFromWebsite(websiteUrl);
      return NextResponse.json(
        {
          success: true,
          profile: result.profile,
          websiteUrl: result.websiteUrl,
          source: "live",
        },
        { headers: NO_STORE_HEADERS },
      );
    } catch (error: unknown) {
      if (looksLikeAlibaba(websiteUrl)) {
        return NextResponse.json(
          {
            success: true,
            profile: alibabaDemoProfile,
            websiteUrl: ALIBABA_DEMO_URL,
            source: "demo_fixture",
          },
          { headers: NO_STORE_HEADERS },
        );
      }
      if (error instanceof DiscoveryError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status, headers: NO_STORE_HEADERS },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    console.error("Demo business discovery failed.", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        error: errorMessage(
          error,
          "Failed to auto-discover business profile.",
        ),
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

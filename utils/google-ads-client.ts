const GOOGLE_ADS_API_VERSION = "v25";
const GOOGLE_ADS_API_ORIGIN = "https://googleads.googleapis.com";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleAdsCredentials {
  customerId: string;
  developerToken: string;
  loginCustomerId?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
}

export interface LiveCampaignData {
  id: string;
  name: string;
  status: string;
  channelType: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  conversionsValue: number;
  roas: number;
}

export type GoogleAdsErrorCode =
  | "configuration_required"
  | "oauth_required"
  | "access_denied"
  | "google_ads_api_error"
  | "network_error";

export interface GoogleAdsApiResponse {
  success: boolean;
  configured: boolean;
  source: "live_api" | "unavailable";
  code?: GoogleAdsErrorCode;
  error?: string;
  requestId?: string;
  accountDetails?: {
    customerId: string;
    descriptiveName?: string;
    currencyCode?: string;
    timeZone?: string;
  };
  campaigns: LiveCampaignData[];
}

type GoogleAdsStreamRow = {
  campaign?: {
    id?: string | number;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    advertising_channel_type?: string;
  };
  customer?: {
    descriptiveName?: string;
    descriptive_name?: string;
    currencyCode?: string;
    currency_code?: string;
    timeZone?: string;
    time_zone?: string;
  };
  metrics?: {
    costMicros?: string | number;
    cost_micros?: string | number;
    impressions?: string | number;
    clicks?: string | number;
    ctr?: string | number;
    conversions?: string | number;
    conversionsValue?: string | number;
    conversions_value?: string | number;
  };
};

type GoogleAdsStreamBatch = {
  results?: GoogleAdsStreamRow[];
};

function cleanCustomerId(customerId: string): string {
  return customerId.replaceAll("-", "").trim();
}

function errorMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as
      | { error?: { message?: string } }
      | Array<{ error?: { message?: string } }>;
    const error = Array.isArray(parsed) ? parsed[0]?.error : parsed.error;
    return typeof error?.message === "string" ? error.message : undefined;
  } catch {
    return undefined;
  }
}

export async function refreshGoogleAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      errorMessage(body) ??
        `Google OAuth token refresh failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as { access_token?: unknown };
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new Error("Google OAuth token refresh returned no access token.");
  }

  return data.access_token;
}

function campaignFromRow(row: GoogleAdsStreamRow): LiveCampaignData {
  const campaign = row.campaign ?? {};
  const metrics = row.metrics ?? {};
  const costMicros = Number(metrics.costMicros ?? metrics.cost_micros ?? 0);
  const spend = Number((costMicros / 1_000_000).toFixed(2));
  const conversionsValue = Number(
    Number(
      metrics.conversionsValue ?? metrics.conversions_value ?? 0,
    ).toFixed(2),
  );

  return {
    id: String(campaign.id ?? "unknown"),
    name: campaign.name || "Unnamed Campaign",
    status: campaign.status || "UNKNOWN",
    channelType:
      campaign.advertisingChannelType ??
      campaign.advertising_channel_type ??
      "UNKNOWN",
    spend,
    impressions: Number(metrics.impressions ?? 0),
    clicks: Number(metrics.clicks ?? 0),
    ctr: Number((Number(metrics.ctr ?? 0) * 100).toFixed(2)),
    conversions: Number(Number(metrics.conversions ?? 0).toFixed(1)),
    conversionsValue,
    roas:
      spend > 0 ? Number((conversionsValue / spend).toFixed(2)) : 0,
  };
}

export async function fetchLiveGoogleAdsData(
  credentials: GoogleAdsCredentials,
): Promise<GoogleAdsApiResponse> {
  const customerId = cleanCustomerId(credentials.customerId);
  const developerToken = credentials.developerToken.trim();

  if (!customerId || !developerToken) {
    return {
      success: false,
      configured: false,
      source: "unavailable",
      code: "configuration_required",
      error: "Google Ads customer ID and developer token are required.",
      campaigns: [],
    };
  }

  let accessToken = credentials.accessToken?.trim();
  if (
    !accessToken &&
    credentials.clientId &&
    credentials.clientSecret &&
    credentials.refreshToken
  ) {
    try {
      accessToken = await refreshGoogleAccessToken(
        credentials.clientId,
        credentials.clientSecret,
        credentials.refreshToken,
      );
    } catch (error: unknown) {
      return {
        success: false,
        configured: true,
        source: "unavailable",
        code: "oauth_required",
        error:
          error instanceof Error
            ? error.message
            : "Google OAuth token refresh failed.",
        campaigns: [],
      };
    }
  }

  if (!accessToken) {
    return {
      success: false,
      configured: true,
      source: "unavailable",
      code: "oauth_required",
      error: "Connect Google Ads to authorize campaign access.",
      campaigns: [],
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
  };
  const loginCustomerId = cleanCustomerId(
    credentials.loginCustomerId ?? "",
  );
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  const query = `
    SELECT
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone,
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `.trim();

  try {
    const response = await fetch(
      `${GOOGLE_ADS_API_ORIGIN}/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
        cache: "no-store",
      },
    );
    const requestId =
      response.headers.get("request-id") ??
      response.headers.get("google-ads-request-id") ??
      undefined;

    if (!response.ok) {
      const body = await response.text();
      const message =
        errorMessage(body) ??
        `Google Ads API request failed with status ${response.status}.`;
      const code: GoogleAdsErrorCode =
        response.status === 401
          ? "oauth_required"
          : response.status === 403
            ? "access_denied"
            : "google_ads_api_error";

      return {
        success: false,
        configured: true,
        source: "unavailable",
        code,
        error: message,
        requestId,
        campaigns: [],
      };
    }

    const stream = (await response.json()) as GoogleAdsStreamBatch[];
    const rows = Array.isArray(stream)
      ? stream.flatMap((batch) =>
          Array.isArray(batch.results) ? batch.results : [],
        )
      : [];
    const customer = rows[0]?.customer;

    return {
      success: true,
      configured: true,
      source: "live_api",
      requestId,
      accountDetails: {
        customerId,
        descriptiveName:
          customer?.descriptiveName ?? customer?.descriptive_name,
        currencyCode: customer?.currencyCode ?? customer?.currency_code,
        timeZone: customer?.timeZone ?? customer?.time_zone,
      },
      campaigns: rows.map(campaignFromRow),
    };
  } catch (error: unknown) {
    return {
      success: false,
      configured: true,
      source: "unavailable",
      code: "network_error",
      error:
        error instanceof Error
          ? `Could not reach Google Ads: ${error.message}`
          : "Could not reach Google Ads.",
      campaigns: [],
    };
  }
}

export interface KeywordMetricsData {
  keyword: string;
  avgMonthlySearches: number;
  lowTopOfWeekBidMicros?: number;
  highTopOfWeekBidMicros?: number;
  cpcFormatted?: string;
}

export async function fetchKeywordMetrics(
  credentials: GoogleAdsCredentials,
  keywords: string[]
): Promise<Record<string, KeywordMetricsData>> {
  const customerId = cleanCustomerId(credentials.customerId);
  const developerToken = credentials.developerToken.trim();
  const accessToken = credentials.accessToken?.trim();

  if (!customerId || !developerToken || !accessToken || keywords.length === 0) {
    return {};
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
  };
  if (credentials.loginCustomerId) {
    headers["login-customer-id"] = cleanCustomerId(credentials.loginCustomerId);
  }

  try {
    const url = `${GOOGLE_ADS_API_ORIGIN}/${GOOGLE_ADS_API_VERSION}/customers/${customerId}:generateKeywordHistoricalMetrics`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        keywords,
        historicalMetricsOptions: {
          yearMonthRange: {
            start: { year: 2025, month: 1 },
            end: { year: 2025, month: 12 },
          },
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) return {};

    const data = await response.json();
    const results: Record<string, KeywordMetricsData> = {};
    if (Array.isArray(data.results)) {
      for (const res of data.results) {
        const text = res.text || res.searchQuery;
        const metrics = res.keywordMetrics || {};
        const searches = Number(metrics.avgMonthlySearches || 0);
        const lowBid = Number(metrics.lowTopOfPageBidMicros || 0) / 1_000_000;
        const highBid = Number(metrics.highTopOfPageBidMicros || 0) / 1_000_000;
        const avgCpc = ((lowBid + highBid) / 2 || 1.25).toFixed(2);

        if (text) {
          results[text.toLowerCase()] = {
            keyword: text,
            avgMonthlySearches: searches,
            cpcFormatted: `$${avgCpc}`,
          };
        }
      }
    }
    return results;
  } catch {
    return {};
  }
}



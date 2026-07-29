/**
 * Google Ads API Client Utility for Dopa
 * Uses Google Ads REST API v16/v17 to fetch live campaign performance telemetry.
 */

export interface GoogleAdsCredentials {
  customerId: string; // e.g. "1234567890" (without hyphens)
  developerToken: string;
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
  spend: number; // calculated from cost_micros / 1_000_000
  impressions: number;
  clicks: number;
  ctr: number; // percentage
  conversions: number;
  conversionsValue: number;
  roas: number;
}

export interface GoogleAdsApiResponse {
  success: boolean;
  configured: boolean;
  source: "live_api" | "demo_fallback";
  error?: string;
  accountDetails?: {
    customerId: string;
    descriptiveName?: string;
  };
  campaigns: LiveCampaignData[];
  rawResponse?: unknown;
}

/**
 * Refresh OAuth 2.0 Access Token using Google OAuth Endpoint
 */
export async function refreshGoogleAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth Token Refresh Failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Fetch live campaign telemetry from Google Ads REST API
 */
export async function fetchLiveGoogleAdsData(
  creds: GoogleAdsCredentials
): Promise<GoogleAdsApiResponse> {
  const cleanCustomerId = creds.customerId.replace(/-/g, "").trim();
  if (!cleanCustomerId || !creds.developerToken) {
    return {
      success: false,
      configured: false,
      source: "demo_fallback",
      error: "Missing Customer ID or Developer Token",
      campaigns: [],
    };
  }

  let token = creds.accessToken;
  if (!token && creds.clientId && creds.clientSecret && creds.refreshToken) {
    try {
      token = await refreshGoogleAccessToken(
        creds.clientId,
        creds.clientSecret,
        creds.refreshToken
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        configured: true,
        source: "demo_fallback",
        error: `OAuth Authentication Error: ${msg}`,
        campaigns: [],
      };
    }
  }

  if (!token) {
    return {
      success: false,
      configured: true,
      source: "demo_fallback",
      error: "No Access Token available. Please provide an Access Token or Client ID/Secret/Refresh Token.",
      campaigns: [],
    };
  }

  // Google Ads REST API v16 searchStream query
  const url = `https://googleads.googleapis.com/v16/customers/${cleanCustomerId}/googleAds:searchStream`;
  const gaqlQuery = `
    SELECT
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
    LIMIT 50
  `.trim();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "developer-token": creds.developerToken.trim(),
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({ query: gaqlQuery }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        success: false,
        configured: true,
        source: "demo_fallback",
        error: `Google Ads API Error (${res.status}): ${errBody}`,
        campaigns: [],
      };
    }

    const streamData = await res.json();
    const campaigns: LiveCampaignData[] = [];

    // Parse searchStream result chunks
    if (Array.isArray(streamData)) {
      for (const batch of streamData) {
        if (batch.results && Array.isArray(batch.results)) {
          for (const row of batch.results) {
            const cmp = row.campaign || {};
            const m = row.metrics || {};
            const costMicros = Number(m.costMicros || m.cost_micros || 0);
            const spend = +(costMicros / 1_000_000).toFixed(2);
            const clicks = Number(m.clicks || 0);
            const impressions = Number(m.impressions || 0);
            const ctr = +(Number(m.ctr || 0) * 100).toFixed(2);
            const conversions = +(Number(m.conversions || 0)).toFixed(1);
            const conversionsValue = +(Number(m.conversionsValue || m.conversions_value || 0)).toFixed(2);
            const roas = spend > 0 ? +(conversionsValue / spend).toFixed(2) : 0;

            campaigns.push({
              id: String(cmp.id || `cmp-${Math.random().toString(36).substring(2, 7)}`),
              name: cmp.name || "Unnamed Campaign",
              status: cmp.status || "ENABLED",
              channelType: cmp.advertisingChannelType || cmp.advertising_channel_type || "SEARCH",
              spend,
              impressions,
              clicks,
              ctr,
              conversions,
              conversionsValue,
              roas,
            });
          }
        }
      }
    }

    return {
      success: true,
      configured: true,
      source: "live_api",
      accountDetails: { customerId: cleanCustomerId },
      campaigns,
      rawResponse: streamData,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      configured: true,
      source: "demo_fallback",
      error: `Network / API Error: ${msg}`,
      campaigns: [],
    };
  }
}

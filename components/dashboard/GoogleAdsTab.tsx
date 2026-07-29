"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type {
  GoogleAdsApiResponse,
  GoogleAdsErrorCode,
  LiveCampaignData,
} from "@/utils/google-ads-client";

type ConnectionState =
  | "loading"
  | "connected"
  | "oauth_required"
  | "configuration_required"
  | "error";

type CampaignFilter =
  | "All"
  | "Performance Max"
  | "YouTube"
  | "Search"
  | "Display";

const filters: CampaignFilter[] = [
  "All",
  "Performance Max",
  "YouTube",
  "Search",
  "Display",
];

function matchesFilter(
  campaign: LiveCampaignData,
  filter: CampaignFilter,
): boolean {
  if (filter === "All") return true;
  const channel = campaign.channelType.toUpperCase();
  if (filter === "Performance Max") return channel === "PERFORMANCE_MAX";
  if (filter === "YouTube") return channel.includes("VIDEO");
  return channel.includes(filter.toUpperCase());
}

function humanizeChannel(channel: string): string {
  return channel
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function connectionStateFor(
  code: GoogleAdsErrorCode | undefined,
): ConnectionState {
  if (code === "configuration_required") return "configuration_required";
  if (code === "oauth_required") return "oauth_required";
  return "error";
}

function oauthNotice(result: string | undefined): string | null {
  if (result === "configuration_required") {
    return "Google authorization succeeded, but secure token storage is not configured.";
  }
  if (result === "oauth_error") {
    return "Google did not return an Ads access token. Reconnect and approve the requested access.";
  }
  return null;
}

export function GoogleAdsTab({
  dopaEmail,
  oauthResult,
}: {
  dopaEmail: string;
  oauthResult?: string;
}) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("loading");
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [account, setAccount] =
    useState<GoogleAdsApiResponse["accountDetails"]>();
  const [campaigns, setCampaigns] = useState<LiveCampaignData[]>([]);
  const [filter, setFilter] = useState<CampaignFilter>("All");
  const [notice, setNotice] = useState<string | null>(() =>
    oauthNotice(oauthResult),
  );

  const fetchGoogleAds = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/google-ads", {
        cache: "no-store",
        signal,
      });
      const data = (await response.json()) as GoogleAdsApiResponse;

      if (response.ok && data.success) {
        setCampaigns(data.campaigns);
        setAccount(data.accountDetails);
        setConnectionState("connected");
        return;
      }

      setCampaigns([]);
      setAccount(undefined);
      setApiError(data.error ?? "Google Ads could not be connected.");
      setConnectionState(connectionStateFor(data.code));
    } catch (error: unknown) {
      if (signal?.aborted) return;
      setCampaigns([]);
      setAccount(undefined);
      setApiError(
        error instanceof Error
          ? `Could not load Google Ads: ${error.message}`
          : "Could not load Google Ads.",
      );
      setConnectionState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void fetchGoogleAds(controller.signal));
    return () => controller.abort();
  }, [fetchGoogleAds]);

  const refreshGoogleAds = () => {
    setConnectionState("loading");
    setApiError(null);
    void fetchGoogleAds();
  };

  const handleOAuthConnect = async () => {
    setIsConnectingOAuth(true);
    setNotice(null);

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/dashboard?tab=googleAds");
      callbackUrl.searchParams.set("google_ads", "1");

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          scopes: "https://www.googleapis.com/auth/adwords",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      setIsConnectingOAuth(false);
      setNotice(
        error instanceof Error
          ? `Google authorization failed: ${error.message}`
          : "Google authorization failed.",
      );
    }
  };

  const handleDisconnect = async () => {
    setNotice(null);

    try {
      const response = await fetch("/api/google-ads", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Could not clear the Google Ads connection.");
      }

      setCampaigns([]);
      setAccount(undefined);
      setConnectionState("oauth_required");
      setNotice(
        "Google Ads disconnected. Your Dopa session is still active.",
      );
    } catch (error: unknown) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not disconnect Google Ads.",
      );
    }
  };

  const filteredCampaigns = useMemo(
    () => campaigns.filter((campaign) => matchesFilter(campaign, filter)),
    [campaigns, filter],
  );
  const totalSpend = campaigns.reduce(
    (total, campaign) => total + campaign.spend,
    0,
  );
  const totalConversions = campaigns.reduce(
    (total, campaign) => total + campaign.conversions,
    0,
  );
  const totalConversionValue = campaigns.reduce(
    (total, campaign) => total + campaign.conversionsValue,
    0,
  );
  const totalImpressions = campaigns.reduce(
    (total, campaign) => total + campaign.impressions,
    0,
  );
  const totalClicks = campaigns.reduce(
    (total, campaign) => total + campaign.clicks,
    0,
  );
  const aggregateRoas =
    totalSpend > 0 ? totalConversionValue / totalSpend : 0;
  const aggregateCtr =
    totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const currency = account?.currencyCode ?? "USD";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]">
        <div>
          <div className="flex items-center gap-2.5">
            <GoogleMark />
            <h2 className="text-[15px] font-medium text-white">
              Google Ads Integration
            </h2>
            <ConnectionBadge state={connectionState} />
          </div>
          <p className="mt-1 text-[13px] text-secondary">
            Live campaign performance from the last 30 days.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {connectionState === "connected" ? (
            <>
              <button
                onClick={refreshGoogleAds}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-secondary transition-colors hover:border-white/20 hover:text-white"
              >
                Refresh
              </button>
              <button
                onClick={() => void handleDisconnect()}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-secondary transition-colors hover:border-red-400/30 hover:text-red-400"
              >
                Disconnect Ads
              </button>
            </>
          ) : connectionState !== "configuration_required" ? (
            <ConnectButton
              isConnecting={isConnectingOAuth}
              onClick={() => void handleOAuthConnect()}
            />
          ) : (
            <button
              onClick={refreshGoogleAds}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-secondary transition-colors hover:border-white/20 hover:text-white"
            >
              Check configuration
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-[13px] text-brand animate-fade-in">
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-brand/70 hover:text-brand"
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {connectionState === "loading" ? (
        <LoadingState />
      ) : connectionState === "configuration_required" ? (
        <EmptyState
          title="Google Ads configuration required"
          body={
            apiError ??
            "Add the server-side Google Ads credentials, then check again."
          }
          action={
            <button
              onClick={refreshGoogleAds}
              className="mt-6 rounded-lg bg-white px-5 py-2.5 text-[14px] font-medium text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Check again
            </button>
          }
        />
      ) : connectionState !== "connected" ? (
        <EmptyState
          title={
            connectionState === "oauth_required"
              ? "Connect your Google Ads account"
              : "Google Ads needs attention"
          }
          body={
            apiError ??
            "Authorize Dopa to read campaign performance from Google Ads."
          }
          action={
            <ConnectButton
              isConnecting={isConnectingOAuth}
              onClick={() => void handleOAuthConnect()}
              large
            />
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] px-4 py-3 text-[12px] text-secondary">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                Account:{" "}
                <span className="font-medium text-white">
                  {account?.descriptiveName ??
                    `Google Ads #${account?.customerId}`}
                </span>
              </div>
              <div className="hidden text-white/20 sm:block">|</div>
              <div>
                Dopa session:{" "}
                <span className="font-medium text-white">{dopaEmail}</span>
              </div>
              {account?.timeZone && (
                <>
                  <div className="hidden text-white/20 sm:block">|</div>
                  <div>{account.timeZone}</div>
                </>
              )}
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Google Ads API v25
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]">
            <MetricCard
              label="Total live spend"
              value={new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
              }).format(totalSpend)}
            />
            <MetricCard
              label="Live conversions"
              value={totalConversions.toLocaleString()}
            />
            <MetricCard
              label="Total ROAS"
              value={`${aggregateRoas.toFixed(2)}×`}
            />
            <MetricCard
              label="Total live CTR"
              value={`${aggregateCtr.toFixed(2)}%`}
            />
          </div>

          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-8 text-center">
              <p className="text-[14px] font-medium text-white">
                Account connected
              </p>
              <p className="mt-1.5 text-[13px] text-secondary">
                Google Ads returned no campaigns for the last 30 days.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-[14px] font-medium text-white">
                  Live Google Ads Campaigns ({filteredCampaigns.length})
                </h3>
                <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                  {filters.map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilter(option)}
                      className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
                        filter === option
                          ? "bg-white/10 font-medium text-white"
                          : "text-secondary hover:text-white"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-medium uppercase tracking-wider text-tertiary">
                        <th className="px-4 py-3">Campaign & channel</th>
                        <th className="px-4 py-3">Spend</th>
                        <th className="px-4 py-3">CTR</th>
                        <th className="px-4 py-3">Conversions</th>
                        <th className="px-4 py-3">ROAS</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredCampaigns.map((campaign) => (
                        <tr
                          key={campaign.id}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-white">
                              {campaign.name}
                            </div>
                            <div className="mt-0.5 text-[11px] text-tertiary">
                              {humanizeChannel(campaign.channelType)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-white">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency,
                              maximumFractionDigits: 2,
                            }).format(campaign.spend)}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-white">
                            {campaign.ctr.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3.5 text-white">
                            {campaign.conversions.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-emerald-400">
                            {campaign.roas.toFixed(2)}×
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              {campaign.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 6.721 2 2 6.721 2 12.545S6.721 23.09 12.545 23.09c6.627 0 10.5-4.664 10.5-10.732 0-.663-.067-1.309-.172-1.921h-10.328z" />
      </svg>
    </span>
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  const connected = state === "connected";
  const label =
    state === "loading"
      ? "Checking"
      : connected
        ? "Campaign data connected"
        : state === "configuration_required"
          ? "Configuration needed"
          : "Not connected";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        connected
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/20 bg-amber-500/10 text-amber-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-emerald-400" : "bg-amber-400"
        }`}
      />
      {label}
    </span>
  );
}

function ConnectButton({
  isConnecting,
  onClick,
  large = false,
}: {
  isConnecting: boolean;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isConnecting}
      className={`inline-flex items-center gap-2.5 rounded-lg bg-white font-medium text-black shadow-lg transition-all hover:bg-white/90 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70 ${
        large ? "mt-6 px-5 py-2.5 text-[14px]" : "px-4 py-2 text-[13px]"
      }`}
    >
      {isConnecting ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
          Redirecting to Google…
        </>
      ) : (
        <>
          <GoogleMark />
          Connect with Google
        </>
      )}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.015] px-6 py-20 text-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      <p className="mt-4 text-[13px] text-secondary">
        Checking Google Ads authorization and campaign data…
      </p>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] px-6 py-16 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        <GoogleMark />
      </div>
      <h3 className="mt-4 text-[16px] font-medium text-white">{title}</h3>
      <p className="mt-1.5 max-w-[480px] text-[13px] leading-relaxed text-secondary">
        {body}
      </p>
      {action}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/10">
      <div className="text-[11px] font-medium uppercase tracking-wider text-tertiary">
        {label}
      </div>
      <div className="mt-1.5 text-[24px] font-semibold tracking-[-0.03em] text-white">
        {value}
      </div>
    </div>
  );
}

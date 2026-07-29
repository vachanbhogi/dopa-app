import type { GoogleAdsErrorCode } from "@/utils/google-ads-client";

export type GoogleAdsSetupStepState = "complete" | "current" | "upcoming";

export type GoogleAdsSetupStep = {
  label: string;
  description: string;
  state: GoogleAdsSetupStepState;
};

export type GoogleAdsOnboarding = {
  eyebrow: string;
  title: string;
  message: string;
  prompt: string;
  steps: GoogleAdsSetupStep[];
};

type GoogleAdsOnboardingInput = {
  errorCode?: GoogleAdsErrorCode;
  oauthResult?: string;
};

const connectStep: GoogleAdsSetupStep = {
  label: "Sign in with Google",
  description: "Approve read-only Google Ads access for Dopa.",
  state: "current",
};

const linkStep: GoogleAdsSetupStep = {
  label: "Link customer and manager",
  description:
    "Your customer account holds campaigns. Your manager account holds API access. The customer account must accept the manager’s link request.",
  state: "upcoming",
};

const apiAccessStep: GoogleAdsSetupStep = {
  label: "Confirm production API access",
  description:
    "The manager account needs Basic or Standard API access. Test Account Access cannot read a real Ads account.",
  state: "upcoming",
};

export function googleAdsOnboardingFor({
  errorCode,
  oauthResult,
}: GoogleAdsOnboardingInput): GoogleAdsOnboarding {
  if (errorCode === "configuration_required") {
    return {
      eyebrow: "Denver · setup check",
      title: "This needs a Dopa configuration update.",
      message:
        "Your Google account is not the problem. A Dopa administrator needs to finish the server-side Google Ads credentials before anyone can connect.",
      prompt:
        "Why does Google Ads say configuration required, and what does the Dopa administrator need to check?",
      steps: [
        {
          label: "Google Ads server credentials",
          description:
            "Customer ID, manager ID, OAuth credentials, developer token, and secure token storage must be configured together.",
          state: "current",
        },
        {
          ...connectStep,
          state: "upcoming",
        },
      ],
    };
  }

  if (errorCode === "access_denied") {
    return {
      eyebrow: "Denver · account access",
      title: "Google sign-in worked. Account access still needs setup.",
      message:
        "Signing in proves who you are. It does not automatically connect the Google Ads customer account that owns your campaigns to the manager account Dopa uses for API access.",
      prompt:
        "Google sign-in worked but campaign access is denied. Walk me through linking my Google Ads customer account to the manager account and checking Basic API access.",
      steps: [
        {
          ...connectStep,
          description: "Google returned an Ads access token to Dopa.",
          state: "complete",
        },
        {
          ...linkStep,
          state: "current",
        },
        {
          ...apiAccessStep,
          state: "current",
        },
      ],
    };
  }

  if (errorCode === "network_error" || errorCode === "google_ads_api_error") {
    return {
      eyebrow: "Denver · connection check",
      title: "Your setup may be fine. Google Ads did not answer.",
      message:
        "Try the connection check again before changing account permissions. If it keeps failing, Denver can help separate a temporary API issue from an account-access issue.",
      prompt:
        "Dopa could not load Google Ads. Help me check whether this is a temporary API problem or an account-access problem.",
      steps: [
        {
          label: "Retry the account check",
          description:
            "A temporary Google Ads response should not require reconnecting.",
          state: "current",
        },
        {
          label: "Review account access",
          description:
            "If the retry is denied, confirm the customer-manager link and the developer token’s access level.",
          state: "upcoming",
        },
      ],
    };
  }

  const signInCompleted =
    errorCode !== "oauth_required" &&
    (oauthResult === "connected" || oauthResult === "connected_temporary");

  return {
    eyebrow: "Denver · guided setup",
    title: signInCompleted
      ? "Google sign-in finished. Now let’s verify Ads access."
      : "Let’s connect the right Google Ads account.",
    message:
      "Dopa only reads campaign performance. It cannot create ads, change budgets, or spend money.",
    prompt:
      "Walk me through connecting Google Ads to Dopa. Explain the customer account, manager account, and read-only permissions.",
    steps: [
      {
        ...connectStep,
        description: signInCompleted
          ? "Google sign-in completed. Dopa is checking campaign access."
          : connectStep.description,
        state: signInCompleted ? "complete" : "current",
      },
      linkStep,
      apiAccessStep,
    ],
  };
}

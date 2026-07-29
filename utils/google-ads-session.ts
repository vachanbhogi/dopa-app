import { cookies } from "next/headers";
import {
  GOOGLE_ADS_TOKEN_COOKIE,
  isGoogleAdsAccessTokenFresh,
  openGoogleAdsToken,
  sealGoogleAdsToken,
} from "@/utils/google-ads-token";
import { refreshGoogleAccessToken } from "@/utils/google-ads-client";

type GoogleAdsSession = {
  accessToken?: string;
  refreshedCookie?: string;
  clearCookie: boolean;
};

export async function getGoogleAdsSession(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  userId: string,
): Promise<GoogleAdsSession> {
  const sealedToken = cookieStore.get(GOOGLE_ADS_TOKEN_COOKIE)?.value;
  const encryptionKey = process.env.GOOGLE_ADS_TOKEN_ENCRYPTION_KEY;
  if (!sealedToken || !encryptionKey) {
    return { clearCookie: Boolean(sealedToken) };
  }

  const tokens = await openGoogleAdsToken(
    sealedToken,
    encryptionKey,
    userId,
  );
  if (!tokens) return { clearCookie: true };
  if (isGoogleAdsAccessTokenFresh(tokens)) {
    return { accessToken: tokens.accessToken, clearCookie: false };
  }

  const clientId = process.env.GOOGLE_ADS_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { clearCookie: false };

  try {
    const accessToken = await refreshGoogleAccessToken(
      clientId,
      clientSecret,
      tokens.refreshToken,
    );
    const refreshedCookie = await sealGoogleAdsToken(
      {
        accessToken,
        refreshToken: tokens.refreshToken,
      },
      encryptionKey,
      userId,
    );
    return { accessToken, refreshedCookie, clearCookie: false };
  } catch {
    return { clearCookie: true };
  }
}

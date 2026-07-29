"use server";

import { createClient } from "@/utils/supabase/server";
import { GOOGLE_ADS_TOKEN_COOKIE } from "@/utils/google-ads-token";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/utils/safe-next-url";

async function getOrigin() {
  const headersList = await headers();
  const configured = normalizedOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  const requestHost = (
    headersList.get("x-forwarded-host") ??
    headersList.get("host") ??
    ""
  )
    .split(",")[0]
    ?.trim();
  const requestOrigin = normalizedOrigin(headersList.get("origin"));
  if (requestOrigin && new URL(requestOrigin).host === requestHost) {
    return requestOrigin;
  }

  const forwardedProtocol = headersList
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : process.env.NODE_ENV === "production"
        ? "https"
        : "http";
  return normalizedOrigin(`${protocol}://${requestHost}`) ?? "http://localhost:3000";
}

function normalizedOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");
  const destination = safeNextPath(redirectTo, await getOrigin());

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/?modal=login&error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(destination)}`,
    );
  }

  redirect(destination);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  const supabase = createClient(await cookies());
  const origin = await getOrigin();
  const destination = safeNextPath(redirectTo, origin);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: new URL(destination, origin).href,
    },
  });

  if (error) {
    redirect(
      `/?modal=signup&error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(destination)}`,
    );
  }

  if (data.session) {
    redirect(destination);
  }

  redirect("/?modal=login&message=Check your email to confirm your account");
}

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  cookieStore.delete(GOOGLE_ADS_TOKEN_COOKIE);
  redirect("/");
}

export async function signInWithGoogle(redirectTo = "/dashboard", requestGoogleAdsScope = false) {
  const supabase = createClient(await cookies());
  const origin = await getOrigin();
  const destination = safeNextPath(redirectTo, origin);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      scopes: requestGoogleAdsScope ? "https://www.googleapis.com/auth/adwords" : undefined,
    },
  });

  if (error) {
    redirect(`/?modal=login&error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithGoogleFromForm(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");
  await signInWithGoogle(redirectTo);
}

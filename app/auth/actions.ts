"use server";

import { createClient } from "@/utils/supabase/server";
import { GOOGLE_ADS_TOKEN_COOKIE } from "@/utils/google-ads-token";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getOrigin() {
  const headersList = await headers();
  return (
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/?modal=login&error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  redirect(redirectTo);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = createClient(await cookies());
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/dashboard`,
    },
  });

  if (error) {
    redirect(`/?modal=signup&error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    redirect("/dashboard");
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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
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

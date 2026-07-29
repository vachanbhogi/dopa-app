import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function getAuthenticatedUser() {
  return (await getApiAuth())?.user ?? null;
}

export async function getApiAuth() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { cookieStore, supabase, user } : null;
}

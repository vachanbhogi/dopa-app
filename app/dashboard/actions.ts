"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  BUSINESS_SELECT,
  normalizeBusinessInput,
  type Business,
  type BusinessInput,
} from "@/lib/business-types";

async function requireUser() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" as const, supabase, user: null };
  }

  return { supabase, user, error: null };
}

function revalidateDashboard() {
  revalidatePath("/dashboard");
}

export async function selectBusiness(businessId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const { data: business, error: businessError } = await auth.supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (businessError) return { error: businessError.message };
  if (!business) return { error: "Business not found" };

  const { error } = await auth.supabase.from("user_preferences").upsert(
    {
      user_id: auth.user.id,
      selected_business_id: businessId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidateDashboard();
  return { success: true };
}

export async function createBusiness(input: BusinessInput) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const normalized = normalizeBusinessInput(input);
  if ("error" in normalized) return { error: normalized.error };

  const { data, error } = await auth.supabase
    .from("businesses")
    .insert({
      owner_id: auth.user.id,
      ...normalized.data,
      updated_at: new Date().toISOString(),
    })
    .select(BUSINESS_SELECT)
    .single();

  if (error) return { error: error.message };

  await auth.supabase.from("user_preferences").upsert(
    {
      user_id: auth.user.id,
      selected_business_id: data.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  revalidateDashboard();
  return { success: true, business: data as Business };
}

export async function updateBusiness(businessId: string, input: BusinessInput) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const normalized = normalizeBusinessInput(input);
  if ("error" in normalized) return { error: normalized.error };

  const { data, error } = await auth.supabase
    .from("businesses")
    .update({
      ...normalized.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId)
    .eq("owner_id", auth.user.id)
    .select(BUSINESS_SELECT)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Business not found" };

  revalidateDashboard();
  return { success: true, business: data as Business };
}

export async function deleteBusiness(businessId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const { data: owned, error: listError } = await auth.supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", auth.user.id);

  if (listError) return { error: listError.message };
  if ((owned ?? []).length <= 1) {
    return { error: "You need at least one business" };
  }

  const { error } = await auth.supabase
    .from("businesses")
    .delete()
    .eq("id", businessId)
    .eq("owner_id", auth.user.id);

  if (error) return { error: error.message };

  const remaining = (owned ?? []).filter((b) => b.id !== businessId);
  const nextId = remaining[0]?.id;
  if (nextId) {
    await auth.supabase.from("user_preferences").upsert(
      {
        user_id: auth.user.id,
        selected_business_id: nextId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  revalidateDashboard();
  return { success: true };
}

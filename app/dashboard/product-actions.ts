"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  normalizeProductInput,
  PRODUCT_SELECT,
  type Product,
  type ProductInput,
} from "@/lib/product-types";

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

async function assertBusinessOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  businessId: string,
) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Business not found" };
  return { ok: true as const };
}

function revalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
}

export async function listProducts(businessId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const owned = await assertBusinessOwner(auth.supabase, auth.user.id, businessId);
  if ("error" in owned) return { error: owned.error };

  const { data, error } = await auth.supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { products: (data ?? []) as Product[] };
}

export async function createProduct(businessId: string, input: ProductInput) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const owned = await assertBusinessOwner(auth.supabase, auth.user.id, businessId);
  if ("error" in owned) return { error: owned.error };

  const normalized = normalizeProductInput(input);
  if ("error" in normalized) return { error: normalized.error };

  const { data, error } = await auth.supabase
    .from("products")
    .insert({
      business_id: businessId,
      ...normalized.data,
      updated_at: new Date().toISOString(),
    })
    .select(PRODUCT_SELECT)
    .single();

  if (error) return { error: error.message };

  revalidate();
  return { success: true, product: data as Product };
}

export async function updateProduct(productId: string, input: ProductInput) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const { data: existing, error: fetchError } = await auth.supabase
    .from("products")
    .select("id, business_id")
    .eq("id", productId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Product not found" };

  const owned = await assertBusinessOwner(
    auth.supabase,
    auth.user.id,
    existing.business_id,
  );
  if ("error" in owned) return { error: owned.error };

  const normalized = normalizeProductInput(input);
  if ("error" in normalized) return { error: normalized.error };

  const { data, error } = await auth.supabase
    .from("products")
    .update({
      ...normalized.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .select(PRODUCT_SELECT)
    .single();

  if (error) return { error: error.message };

  revalidate();
  return { success: true, product: data as Product };
}

export async function deleteProduct(productId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Not authenticated" };

  const { data: existing, error: fetchError } = await auth.supabase
    .from("products")
    .select("id, business_id")
    .eq("id", productId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Product not found" };

  const owned = await assertBusinessOwner(
    auth.supabase,
    auth.user.id,
    existing.business_id,
  );
  if ("error" in owned) return { error: owned.error };

  const { error } = await auth.supabase.from("products").delete().eq("id", productId);
  if (error) return { error: error.message };

  revalidate();
  return { success: true };
}

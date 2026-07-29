export type Product = {
  id: string;
  business_id: string;
  product_name: string;
  category: string | null;
  price: number | null;
  value_prop: string | null;
  target_sub_demographic: string | null;
  key_features: string[];
  creative_hooks: string[];
};

export type ProductInput = {
  product_name: string;
  category?: string;
  price?: string;
  value_prop?: string;
  target_sub_demographic?: string;
  key_features?: string;
  creative_hooks?: string;
};

export const PRODUCT_SELECT =
  "id, business_id, product_name, category, price, value_prop, target_sub_demographic, key_features, creative_hooks";

export const PRODUCT_CATEGORIES = [
  "Skincare",
  "Apparel",
  "Electronics",
  "Software / SaaS",
  "Food & beverage",
  "Fitness",
  "Home & living",
  "Services",
  "Other",
] as const;

export function emptyProductInput(): ProductInput {
  return {
    product_name: "",
    category: "",
    price: "",
    value_prop: "",
    target_sub_demographic: "",
    key_features: "",
    creative_hooks: "",
  };
}

export function productToInput(product: Product): ProductInput {
  return {
    product_name: product.product_name,
    category: product.category ?? "",
    price: product.price != null ? String(product.price) : "",
    value_prop: product.value_prop ?? "",
    target_sub_demographic: product.target_sub_demographic ?? "",
    key_features: product.key_features.join(", "),
    creative_hooks: product.creative_hooks.join("\n"),
  };
}

function parseList(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeProductInput(input: ProductInput) {
  const product_name = input.product_name.trim();
  if (!product_name) {
    return { error: "Product name is required" as const };
  }

  const priceRaw = input.price?.trim();
  let price: number | null = null;
  if (priceRaw) {
    const parsed = Number(priceRaw.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(parsed)) {
      return { error: "Enter a valid price" as const };
    }
    price = parsed;
  }

  return {
    data: {
      product_name,
      category: input.category?.trim() || null,
      price,
      value_prop: input.value_prop?.trim() || null,
      target_sub_demographic: input.target_sub_demographic?.trim() || null,
      key_features: parseList(input.key_features),
      creative_hooks: parseList(input.creative_hooks),
    },
  };
}

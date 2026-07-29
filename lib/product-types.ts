export type Product = {
  id: string;
  business_id: string;
  product_name: string;
  category: string | null;
  price: number | null;
  price_label: string | null;
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
  "id, business_id, product_name, category, price, price_label, value_prop, target_sub_demographic, key_features, creative_hooks";

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

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUsd(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

const PRICE_RANGE_SEP = " – ";

function formatPriceRange(low: number, high: number): string {
  return `${formatUsd(low)}${PRICE_RANGE_SEP}${formatUsd(high)}`;
}

/** Display price for cards — supports ranges like $599 – $1,099 */
export function formatProductPriceDisplay(product: Product): string | null {
  if (product.price_label?.trim()) {
    return normalizePriceLabelDisplay(product.price_label.trim());
  }

  if (product.price == null) return null;

  const value = product.price;

  // Legacy fix: concatenated range like 5991099 → $599 – $1,099
  if (value >= 10_000 && Number.isInteger(value)) {
    const digits = String(Math.round(value));
    for (const splitAt of [3, 4]) {
      if (digits.length <= splitAt) continue;
      const low = Number(digits.slice(0, splitAt));
      const high = Number(digits.slice(splitAt));
      if (low >= 1 && high >= low && high <= 999_999) {
        return formatPriceRange(low, high);
      }
    }
  }

  return formatUsd(value);
}

function normalizePriceLabelDisplay(label: string): string {
  return label.replace(/\s*[–—-]\s*/g, PRICE_RANGE_SEP);
}

/** Raw price string for form inputs — e.g. 599-1099 */
export function priceLabelToInput(label: string): string {
  return label
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s*[–—-]\s*/g, "-");
}

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
  let price = "";
  if (product.price_label?.trim()) {
    price = priceLabelToInput(product.price_label);
  } else if (product.price != null) {
    const display = formatProductPriceDisplay(product);
    if (display?.includes(" – ")) {
      price = priceLabelToInput(display);
    } else if (display) {
      price = display.replace(/^\$/, "").replace(/,/g, "");
    } else {
      price = String(product.price);
    }
  }

  return {
    product_name: product.product_name,
    category: product.category ?? "",
    price,
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

function parsePriceInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { price: null as number | null, price_label: null as string | null };
  }

  const rangeMatch = trimmed.match(/^(\d[\d.,]*)\s*[-–—]\s*(\d[\d.,]*)$/);
  if (rangeMatch) {
    const low = parseAmount(rangeMatch[1]);
    const high = parseAmount(rangeMatch[2]);
    if (low == null || high == null) {
      return { error: "Enter a valid price range" as const };
    }
    if (high < low) {
      return { error: "Price range max must be greater than min" as const };
    }
    return {
      price: low,
      price_label: formatPriceRange(low, high),
    };
  }

  const single = parseAmount(trimmed);
  if (single == null) {
    return { error: "Enter a valid price" as const };
  }

  return { price: single, price_label: null as string | null };
}

export function normalizeProductInput(input: ProductInput) {
  const product_name = input.product_name.trim();
  if (!product_name) {
    return { error: "Product name is required" as const };
  }

  const priceParsed = parsePriceInput(input.price ?? "");
  if ("error" in priceParsed) {
    return { error: priceParsed.error };
  }

  return {
    data: {
      product_name,
      category: input.category?.trim() || null,
      price: priceParsed.price,
      price_label: priceParsed.price_label,
      value_prop: input.value_prop?.trim() || null,
      target_sub_demographic: input.target_sub_demographic?.trim() || null,
      key_features: parseList(input.key_features),
      creative_hooks: parseList(input.creative_hooks),
    },
  };
}

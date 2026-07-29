"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/app/dashboard/product-actions";
import type { Business } from "@/lib/business-types";
import {
  emptyProductInput,
  PRODUCT_CATEGORIES,
  productToInput,
  type Product,
  type ProductInput,
} from "@/lib/product-types";

export function ProductsTab({
  businessId,
  business,
}: {
  businessId: string;
  business: Business;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listProducts(businessId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setProducts(result.products ?? []);
  }, [businessId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openCreate = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  return (
    <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[14px] leading-6 text-secondary">
            Product profiles power creative generation and TRIBE v2 pre-tests.
            Each product inherits{" "}
            <span className="text-white">{business.name}</span>&apos;s brand defaults
            unless you override them here.
          </p>
          <BrandDefaultsSummary business={business} />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97]"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add product
        </button>
      </div>

      {error ? (
        <p className="text-[13px] text-red-400">{error}</p>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-white/6 bg-white/2" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyProducts onAdd={openCreate} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEdit(product)}
              onDelete={async () => {
                const result = await deleteProduct(product.id);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                await loadProducts();
              }}
            />
          ))}
        </div>
      )}

      {modalOpen ? (
        <ProductModal
          business={business}
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await loadProducts();
          }}
        />
      ) : null}
    </div>
  );
}

function BrandDefaultsSummary({ business }: { business: Business }) {
  const items = [
    business.target_audience && { label: "Audience", value: business.target_audience },
    business.price_range && { label: "Price tier", value: business.price_range },
    business.brand_voice && { label: "Tone", value: business.brand_voice },
    business.target_keywords && { label: "Keywords", value: business.target_keywords },
  ].filter(Boolean) as { label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/2 px-2.5 py-1 text-[11px] text-secondary"
        >
          <span className="text-tertiary">{item.label}:</span>
          <span className="max-w-[180px] truncate text-white/80">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function EmptyProducts({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/1.5 py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/4">
        <svg className="h-6 w-6 text-white/30" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M3 4h10v9H3zM6 2v2M10 2v2" />
        </svg>
      </div>
      <p className="mt-4 text-[15px] font-medium text-white">No products yet</p>
      <p className="mt-1.5 max-w-sm text-center text-[13px] leading-5 text-secondary">
        Add your first product to fuel ad ideas, hooks, and TRIBE v2 scoring.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97]"
      >
        Add first product
      </button>
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="group rounded-xl border border-white/6 bg-white/2 p-5 transition-[border-color,background-color] duration-150 hover:border-white/10 hover:bg-white/3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-white">
            {product.product_name}
          </h3>
          {product.category ? (
            <p className="mt-0.5 text-[12px] text-tertiary">{product.category}</p>
          ) : null}
        </div>
        {product.price != null ? (
          <span className="shrink-0 font-mono text-[13px] text-secondary">
            ${product.price}
          </span>
        ) : null}
      </div>

      {product.value_prop ? (
        <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-secondary">
          {product.value_prop}
        </p>
      ) : null}

      {product.creative_hooks.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.creative_hooks.slice(0, 2).map((hook) => (
            <span
              key={hook}
              className="rounded-md bg-brand/10 px-2 py-0.5 text-[11px] text-brand"
            >
              {hook}
            </span>
          ))}
          {product.creative_hooks.length > 2 ? (
            <span className="text-[11px] text-tertiary">
              +{product.creative_hooks.length - 2} more
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-secondary transition-[border-color,color] duration-150 hover:border-white/20 hover:text-white"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Delete ${product.product_name}?`)) return;
            startTransition(onDelete);
          }}
          className="rounded-md border border-red-400/20 px-2.5 py-1 text-[12px] text-red-400 transition-[border-color,opacity] duration-150 hover:border-red-400/40 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function ProductModal({
  business,
  product,
  onClose,
  onSaved,
}: {
  business: Business;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductInput>(() =>
    product ? productToInput(product) : emptyProductInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setField = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, form)
        : await createProduct(business.id, form);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#111114] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-medium text-white">
          {product ? "Edit product" : "Add product"}
        </h2>
        <p className="mt-1 text-[13px] text-secondary">
          Inherits audience and tone from {business.name} unless overridden.
        </p>

        <div className="mt-6 grid gap-4">
          <Field label="Product name" required>
            <input
              autoFocus
              value={form.product_name}
              onChange={(e) => setField("product_name", e.target.value)}
              placeholder="Aura Glow Skin Serum"
              className={inputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                className={inputClass}
              >
                <option value="">Select category</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price">
              <input
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="79"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Value proposition" hint="Single biggest benefit">
            <textarea
              value={form.value_prop}
              onChange={(e) => setField("value_prop", e.target.value)}
              rows={2}
              placeholder="Visible glow in 7 days without oiliness"
              className={`${inputClass} resize-y`}
            />
          </Field>

          <Field
            label="Target sub-demographic"
            hint={`Defaults to: ${business.target_audience || "brand audience"}`}
          >
            <input
              value={form.target_sub_demographic}
              onChange={(e) => setField("target_sub_demographic", e.target.value)}
              placeholder="Working professionals dealing with screen fatigue"
              className={inputClass}
            />
          </Field>

          <Field label="Key features" hint="Comma-separated">
            <input
              value={form.key_features}
              onChange={(e) => setField("key_features", e.target.value)}
              placeholder="Vitamin C, Hyaluronic acid, Non-greasy"
              className={inputClass}
            />
          </Field>

          <Field label="Creative hooks" hint="One per line — top visual/script hooks">
            <textarea
              value={form.creative_hooks}
              onChange={(e) => setField("creative_hooks", e.target.value)}
              rows={3}
              placeholder={"7-day glow challenge\nBefore/after split screen\nDermatologist-approved"}
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>

        {error ? <p className="mt-4 text-[12px] text-red-400">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-[13px] text-secondary transition-[border-color,color] duration-150 hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !form.product_name.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          >
            {pending ? "Saving…" : product ? "Save" : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none transition-[border-color,background-color] duration-150 placeholder:text-tertiary hover:border-white/15 focus:border-brand/50 focus:bg-white/[0.04]";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline gap-1.5">
        <span className="text-[12px] font-medium text-white">
          {label}
          {required ? <span className="text-brand"> *</span> : null}
        </span>
        {hint ? <span className="text-[11px] text-tertiary">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

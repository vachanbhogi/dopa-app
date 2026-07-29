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
  formatProductPriceDisplay,
  PRODUCT_CATEGORIES,
  productToInput,
  type Product,
  type ProductInput,
} from "@/lib/product-types";
import {
  DopaModal,
  dopaInputClass,
  dopaPrimaryButtonClass,
  dopaTextareaClass,
} from "@/components/ui/DopaModal";
import { NavIcon } from "./DashboardShell";

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
    queueMicrotask(() => void loadProducts());
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-2xl text-[14px] leading-6 text-secondary">
          Product profiles power creative generation and TRIBE v2 pre-tests.
          Each product inherits{" "}
          <span className="text-white">{business.name}</span>&apos;s brand defaults
          unless you override them in the editor.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97]"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add product
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-[13px] text-red-200"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-white/8 bg-[#0c0d0e]"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyProducts onAdd={openCreate} />
      ) : (
        <div className="dopa-panel divide-y divide-white/6 overflow-hidden">
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

function EmptyProducts({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="dopa-panel flex flex-col items-center justify-center border-dashed py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/8 bg-white/4">
        <NavIcon name="box" />
      </span>
      <p className="mt-4 text-[15px] font-medium text-white">No products yet</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-secondary">
        Add your first product to fuel ad ideas, hooks, and TRIBE v2 scoring.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97]"
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
  const hook = product.creative_hooks[0];
  const priceLabel = formatProductPriceDisplay(product);

  return (
    <div className="group flex items-stretch">
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 px-5 py-4 text-left transition-[background-color] duration-150 hover:bg-white/[0.025] active:bg-white/[0.04] sm:px-6 sm:py-5"
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[15px] font-medium tracking-[-0.01em] text-white">
            {product.product_name}
          </span>
          {priceLabel ? (
            <>
              <span className="text-[13px] text-tertiary" aria-hidden>
                ·
              </span>
              <span className="text-[14px] tabular-nums text-secondary">
                {priceLabel}
              </span>
            </>
          ) : null}
          {product.category ? (
            <span className="text-[12px] text-tertiary">{product.category}</span>
          ) : null}
        </div>

        {product.value_prop ? (
          <p className="mt-1.5 text-[13px] leading-6 text-secondary">
            {product.value_prop}
          </p>
        ) : null}

        {hook ? (
          <p className="mt-1 text-[12px] leading-5 text-tertiary">
            {hook}
            {product.creative_hooks.length > 1 ? (
              <span>
                {" "}
                · +{product.creative_hooks.length - 1} more
              </span>
            ) : null}
          </p>
        ) : null}
      </button>

      <button
        type="button"
        disabled={pending}
        aria-label={`Delete ${product.product_name}`}
        onClick={() => {
          if (!window.confirm(`Delete ${product.product_name}?`)) return;
          startTransition(onDelete);
        }}
        className="flex w-14 shrink-0 items-center justify-center self-stretch border-l border-white/6 text-tertiary transition-[background-color,color] duration-150 hover:bg-red-400/[0.08] hover:text-red-400 disabled:opacity-50 sm:w-16"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M6.5 7v4M9.5 7v4M4 4l.6 8.2a1 1 0 001 .8h4.8a1 1 0 001-.8L12 4" />
        </svg>
      </button>
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
    <DopaModal
      title={product ? "Edit product" : "Add product"}
      subtitle={`Inherits audience and tone from ${business.name} unless overridden.`}
      onClose={onClose}
      size="wide"
    >
      {error ? (
        <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <AuthField label="Product name" required className="sm:col-span-2">
          <input
            autoFocus
            value={form.product_name}
            onChange={(e) => setField("product_name", e.target.value)}
            placeholder="iPhone 16 Pro"
            className={dopaInputClass}
          />
        </AuthField>

        <AuthField label="Category">
          <select
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
            className={dopaInputClass}
          >
            <option value="">Select category</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </AuthField>

        <AuthField label="Price" hint="599.99 or 599-1099">
          <input
            value={form.price}
            onChange={(e) => setField("price", e.target.value)}
            placeholder="599-1099"
            className={dopaInputClass}
          />
        </AuthField>

        <AuthField label="Value proposition" className="sm:col-span-2">
          <textarea
            value={form.value_prop}
            onChange={(e) => setField("value_prop", e.target.value)}
            rows={2}
            placeholder="Advanced camera and AI capabilities"
            className={dopaTextareaClass}
          />
        </AuthField>

        <AuthField
          label="Target sub-demographic"
          hint={`Defaults to ${business.target_audience || "brand audience"}`}
          className="sm:col-span-2"
        >
          <input
            value={form.target_sub_demographic}
            onChange={(e) => setField("target_sub_demographic", e.target.value)}
            placeholder="Tech-forward professionals"
            className={dopaInputClass}
          />
        </AuthField>

        <AuthField label="Key features" hint="Comma-separated">
          <input
            value={form.key_features}
            onChange={(e) => setField("key_features", e.target.value)}
            placeholder="A18 chip, 48MP camera, all-day battery"
            className={dopaInputClass}
          />
        </AuthField>

        <AuthField label="Creative hooks" hint="One per line">
          <textarea
            value={form.creative_hooks}
            onChange={(e) => setField("creative_hooks", e.target.value)}
            rows={2}
            placeholder={"Capture life's moments\nShot on iPhone"}
            className={dopaTextareaClass}
          />
        </AuthField>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending || !form.product_name.trim()}
            className={dopaPrimaryButtonClass}
          >
            {pending ? "Saving…" : product ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </DopaModal>
  );
}

function AuthField({
  label,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[12px] font-medium text-secondary">
        {label}
        {required ? <span className="text-brand"> *</span> : null}
        {hint ? <span className="font-normal text-tertiary"> · {hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

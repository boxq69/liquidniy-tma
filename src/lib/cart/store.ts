"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/catalog/types";

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  totalQty: () => number;
  totalUah: () => number;
};

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as CartItem;
  return (
    typeof item.variantId === "string" &&
    typeof item.qty === "number" &&
    typeof item.title === "string" &&
    typeof item.slug === "string" &&
    typeof item.priceUah === "number"
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, ...item, qty: Math.min(99, i.qty + qty) }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, qty: Math.min(99, qty) }],
          };
        });
      },
      setQty: (variantId, qty) => {
        if (qty <= 0) {
          get().removeItem(variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, qty: Math.min(99, qty) } : i,
          ),
        }));
      },
      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        }));
      },
      clear: () => set({ items: [] }),
      totalQty: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      totalUah: () =>
        get().items.reduce((sum, i) => sum + i.priceUah * i.qty, 0),
    }),
    {
      name: "liq-cart-v2",
      merge: (persisted, current) => {
        const stored = persisted as { items?: unknown } | undefined;
        const items = Array.isArray(stored?.items)
          ? stored.items.filter(isCartItem)
          : [];
        return { ...current, items };
      },
    },
  ),
);

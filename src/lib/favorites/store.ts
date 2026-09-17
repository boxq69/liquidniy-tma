"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { asFavoriteCard } from "@/lib/catalog/map";
import type { ProductCard } from "@/lib/catalog/types";

type FavoritesState = {
  items: ProductCard[];
  productIds: string[];
  has: (productId: string) => boolean;
  add: (product: ProductCard) => void;
  remove: (productId: string) => void;
  toggle: (product: ProductCard) => boolean;
  clear: () => void;
};

function isProductCard(value: unknown): value is ProductCard {
  if (!value || typeof value !== "object") return false;
  const product = value as ProductCard;
  return typeof product.id === "string" && typeof product.slug === "string";
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      productIds: [],
      has: (productId) => get().productIds.includes(productId),
      add: (product) => {
        const card = asFavoriteCard(product);
        set((state) => {
          if (state.productIds.includes(card.id)) return state;
          const items = [card, ...state.items];
          return { items, productIds: items.map((item) => item.id) };
        });
      },
      remove: (productId) => {
        set((state) => {
          const items = state.items.filter((item) => item.id !== productId);
          return { items, productIds: items.map((item) => item.id) };
        });
      },
      toggle: (product) => {
        const exists = get().has(product.id);
        if (exists) get().remove(product.id);
        else get().add(product);
        return !exists;
      },
      clear: () => set({ items: [], productIds: [] }),
    }),
    {
      name: "liq-favorites-v2",
      merge: (persisted, current) => {
        const stored = persisted as { items?: unknown } | undefined;
        const items = Array.isArray(stored?.items)
          ? stored.items.filter(isProductCard).map(asFavoriteCard)
          : [];
        return {
          ...current,
          items,
          productIds: items.map((item) => item.id),
        };
      },
    },
  ),
);

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderWithItems } from "@/lib/types";

type LocalOrdersState = {
  orders: OrderWithItems[];
  add: (order: OrderWithItems) => void;
  get: (id: string) => OrderWithItems | undefined;
};

export const useLocalOrdersStore = create<LocalOrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      add: (order) => {
        set((state) => ({
          orders: [
            order,
            ...state.orders.filter((item) => item.id !== order.id),
          ],
        }));
      },
      get: (id) => get().orders.find((order) => order.id === id),
    }),
    { name: "liq-orders" },
  ),
);

export function mergeOrders(
  remote: OrderWithItems[],
  local: OrderWithItems[],
) {
  const byId = new Map<string, OrderWithItems>();
  for (const order of local) byId.set(order.id, order);
  for (const order of remote) byId.set(order.id, order);
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

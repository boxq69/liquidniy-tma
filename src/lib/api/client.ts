import type {
  AdminStats,
  AdminUser,
  CartLine,
  Category,
  OrderStatus,
  OrderWithItems,
  ProductFilters,
  ProductWithDetails,
  PromoCode,
  PromoPreview,
  Promotion,
  SessionUser,
  StatsRange,
  CatalogFilterMeta,
  SiteBanner,
} from "@/lib/types";
import { catalogSearchParams } from "@/lib/catalog/params";
import type {
  CartPayload,
  CategoryInput,
  CheckoutInput,
  ProductInput,
  PromoCodeInput,
  PromotionInput,
} from "@/lib/validations/schemas";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function apiErrorMessage(err: unknown, fallback = "Request failed") {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (/fetch failed/i.test(raw) || /TypeError: fetch failed/i.test(String(err))) {
    return "Немає звʼязку з базою. Відкрий проєкт Supabase — він міг бути на паузі.";
  }
  return raw.trim() || fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch (err) {
    throw new ApiRequestError(503, apiErrorMessage(err));
  }

  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      apiErrorMessage(data.error, data.error ?? "Request failed"),
    );
  }
  return data as T;
}

function productsQuery(filters?: ProductFilters) {
  if (!filters) return "";
  const qs = catalogSearchParams(filters).toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  health: () =>
    request<{ ok: boolean; supabase: boolean; telegram: boolean }>("/api/health"),

  me: () => request<{ user: SessionUser | null }>("/api/me"),

  auth: (initData: string) =>
    request<{ user: SessionUser; startParam: string | null }>(
      "/api/telegram/auth",
      { method: "POST", body: JSON.stringify({ initData }) },
    ),

  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  categories: () => request<{ items: Category[] }>("/api/categories"),

  products: (filters?: ProductFilters) =>
    request<{ items: ProductWithDetails[] }>(
      `/api/products${productsQuery(filters)}`,
    ),

  productFilters: () => request<CatalogFilterMeta>("/api/products?meta=1"),

  product: (slug: string) =>
    request<{ product: ProductWithDetails }>(
      `/api/products/${encodeURIComponent(slug)}`,
    ),

  cart: {
    get: () => request<{ items: CartLine[] }>("/api/cart"),
    set: (payload: CartPayload) =>
      request<{ items: CartLine[] }>("/api/cart", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
  },

  favorites: {
    list: () =>
      request<{ items: ProductWithDetails[]; productIds: string[] }>(
        "/api/favorites",
      ),
    set: (productIds: string[]) =>
      request<{ items: ProductWithDetails[]; productIds: string[] }>(
        "/api/favorites",
        { method: "PUT", body: JSON.stringify({ productIds }) },
      ),
    add: (productId: string) =>
      request<{ items: ProductWithDetails[]; productIds: string[] }>(
        "/api/favorites",
        { method: "POST", body: JSON.stringify({ productId }) },
      ),
    remove: (productId: string) =>
      request<{ items: ProductWithDetails[]; productIds: string[] }>(
        `/api/favorites/${encodeURIComponent(productId)}`,
        { method: "DELETE" },
      ),
  },

  orders: {
    list: () => request<{ items: OrderWithItems[] }>("/api/orders"),
    get: (id: string) =>
      request<{ order: OrderWithItems }>(`/api/orders/${id}`),
    checkout: (input: CheckoutInput) =>
      request<{
        orderId: string;
        totalUah: number;
        persisted: true;
        order: OrderWithItems;
      }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },

  admin: {
    stats: (range: StatsRange = "30d") =>
      request<{ stats: AdminStats }>(`/api/admin/stats?range=${range}`),
    users: {
      list: () => request<{ items: AdminUser[] }>("/api/admin/users"),
      update: (
        id: string,
        input: { isBlocked?: boolean; isAdmin?: boolean },
      ) =>
        request<{ user: AdminUser }>(`/api/admin/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
    },
    products: {
      list: () =>
        request<{ items: ProductWithDetails[] }>("/api/admin/products"),
      get: (id: string) =>
        request<{ product: ProductWithDetails }>(`/api/admin/products/${id}`),
      create: (input: ProductInput) =>
        request<{ product: ProductWithDetails }>("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      update: (id: string, input: Partial<ProductInput>) =>
        request<{ product: ProductWithDetails }>(`/api/admin/products/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      remove: (id: string) =>
        request<{ ok: true }>(`/api/admin/products/${id}`, {
          method: "DELETE",
        }),
    },
    categories: {
      list: () => request<{ items: Category[] }>("/api/admin/categories"),
      create: (input: CategoryInput) =>
        request<{ category: Category }>("/api/admin/categories", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      update: (id: string, input: Partial<CategoryInput>) =>
        request<{ category: Category }>(`/api/admin/categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      remove: (id: string) =>
        request<{ ok: true }>(`/api/admin/categories/${id}`, {
          method: "DELETE",
        }),
    },
    orders: {
      list: (status?: OrderStatus) =>
        request<{ items: OrderWithItems[] }>(
          status
            ? `/api/admin/orders?status=${status}`
            : "/api/admin/orders",
        ),
      get: (id: string) =>
        request<{ order: OrderWithItems }>(`/api/admin/orders/${id}`),
      setStatus: (id: string, status: OrderStatus) =>
        request<{ order: OrderWithItems }>(`/api/admin/orders/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
    },
    uploadImage: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return request<{ url: string; path: string }>("/api/admin/images", {
        method: "POST",
        body,
      });
    },
    banner: {
      get: () => request<{ banner: SiteBanner }>("/api/admin/banner"),
      update: (input: {
        imageUrl?: string;
        href?: string;
        title?: string;
        isActive?: boolean;
      }) =>
        request<{ banner: SiteBanner }>("/api/admin/banner", {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
    },
    promotions: {
      list: () => request<{ items: Promotion[] }>("/api/admin/promotions"),
      create: (input: PromotionInput) =>
        request<{ promotion: Promotion }>("/api/admin/promotions", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      update: (id: string, input: Partial<PromotionInput>) =>
        request<{ promotion: Promotion }>(`/api/admin/promotions/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      remove: (id: string) =>
        request<{ ok: true }>(`/api/admin/promotions/${id}`, {
          method: "DELETE",
        }),
    },
    promoCodes: {
      list: () => request<{ items: PromoCode[] }>("/api/admin/promo-codes"),
      create: (input: PromoCodeInput) =>
        request<{ promoCode: PromoCode }>("/api/admin/promo-codes", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      update: (id: string, input: Partial<PromoCodeInput>) =>
        request<{ promoCode: PromoCode }>(`/api/admin/promo-codes/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      remove: (id: string) =>
        request<{ ok: true }>(`/api/admin/promo-codes/${id}`, {
          method: "DELETE",
        }),
    },
  },

  promo: {
    preview: (input: { code?: string; items: CartPayload["items"] }) =>
      request<PromoPreview>("/api/promo/preview", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
};

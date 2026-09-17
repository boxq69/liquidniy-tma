import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { normalizePromoCode } from "@/lib/pricing";
import type { PromoCode, Promotion } from "@/lib/types";
import type { PromoCodeInput, PromotionInput } from "@/lib/validations/schemas";

type PromotionRow = Omit<Promotion, "product_ids" | "category_ids">;
type PromoCodeRow = Omit<PromoCode, "product_ids" | "category_ids" | "used_count">;

function emptyIso(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function replaceScope(
  table: "promotion_products" | "promo_code_products",
  parentColumn: "promotion_id" | "promo_code_id",
  parentId: string,
  ids: string[],
  childColumn: "product_id",
): Promise<void>;
async function replaceScope(
  table: "promotion_categories" | "promo_code_categories",
  parentColumn: "promotion_id" | "promo_code_id",
  parentId: string,
  ids: string[],
  childColumn: "category_id",
): Promise<void>;
async function replaceScope(
  table: string,
  parentColumn: string,
  parentId: string,
  ids: string[],
  childColumn: string,
) {
  const supabase = createAdminClient();
  const { error: delError } = await supabase
    .from(table)
    .delete()
    .eq(parentColumn, parentId);
  if (delError) throw new ApiError(500, delError.message);
  if (!ids.length) return;
  const { error } = await supabase.from(table).insert(
    ids.map((id) => ({
      [parentColumn]: parentId,
      [childColumn]: id,
    })),
  );
  if (error) throw new ApiError(500, error.message);
}

export async function listPromotions(): Promise<Promotion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingColumnError(error) || error.code === "42P01") return [];
    throw new ApiError(500, error.message);
  }

  const ids = (data ?? []).map((row) => row.id as string);
  const [{ data: products }, { data: categories }] = await Promise.all([
    ids.length
      ? supabase
          .from("promotion_products")
          .select("promotion_id, product_id")
          .in("promotion_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase
          .from("promotion_categories")
          .select("promotion_id, category_id")
          .in("promotion_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const productsBy = new Map<string, string[]>();
  const categoriesBy = new Map<string, string[]>();
  for (const row of products ?? []) {
    const list = productsBy.get(row.promotion_id) ?? [];
    list.push(row.product_id);
    productsBy.set(row.promotion_id, list);
  }
  for (const row of categories ?? []) {
    const list = categoriesBy.get(row.promotion_id) ?? [];
    list.push(row.category_id);
    categoriesBy.set(row.promotion_id, list);
  }

  return ((data ?? []) as PromotionRow[]).map((row) => ({
    ...row,
    product_ids: productsBy.get(row.id) ?? [],
    category_ids: categoriesBy.get(row.id) ?? [],
  }));
}

export async function listLivePromotions() {
  const now = new Date().toISOString();
  const all = await listPromotions();
  return all.filter((promotion) => {
    if (!promotion.is_active) return false;
    if (promotion.starts_at && promotion.starts_at > now) return false;
    if (promotion.ends_at && promotion.ends_at < now) return false;
    return true;
  });
}

async function getPromotion(id: string): Promise<Promotion> {
  const items = await listPromotions();
  const found = items.find((item) => item.id === id);
  if (!found) throw new ApiError(404, "Акцію не знайдено");
  return found;
}

export async function createPromotion(input: PromotionInput): Promise<Promotion> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promotions")
    .insert({
      name: input.name,
      description: input.description ?? "",
      badge_text: input.badgeText ?? "",
      discount_type: input.discountType,
      discount_value: input.discountValue,
      applies_to: input.appliesTo,
      starts_at: emptyIso(input.startsAt),
      ends_at: emptyIso(input.endsAt),
      is_active: input.isActive ?? true,
      stack_with_promo: input.stackWithPromo ?? true,
      priority: input.priority ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) throw new ApiError(500, error?.message ?? "Не вдалося створити акцію");

  try {
    if (input.appliesTo === "products") {
      await replaceScope(
        "promotion_products",
        "promotion_id",
        data.id,
        input.productIds ?? [],
        "product_id",
      );
    }
    if (input.appliesTo === "categories") {
      await replaceScope(
        "promotion_categories",
        "promotion_id",
        data.id,
        input.categoryIds ?? [],
        "category_id",
      );
    }
  } catch (err) {
    await supabase.from("promotions").delete().eq("id", data.id);
    throw err;
  }

  return getPromotion(data.id);
}

export async function updatePromotion(
  id: string,
  input: Partial<PromotionInput>,
): Promise<Promotion> {
  await getPromotion(id);
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.name != null) patch.name = input.name;
  if (input.description != null) patch.description = input.description;
  if (input.badgeText != null) patch.badge_text = input.badgeText;
  if (input.discountType != null) patch.discount_type = input.discountType;
  if (input.discountValue != null) patch.discount_value = input.discountValue;
  if (input.appliesTo != null) patch.applies_to = input.appliesTo;
  if (input.startsAt !== undefined) patch.starts_at = emptyIso(input.startsAt);
  if (input.endsAt !== undefined) patch.ends_at = emptyIso(input.endsAt);
  if (input.isActive != null) patch.is_active = input.isActive;
  if (input.stackWithPromo != null) patch.stack_with_promo = input.stackWithPromo;
  if (input.priority != null) patch.priority = input.priority;

  const { error } = await supabase.from("promotions").update(patch).eq("id", id);
  if (error) throw new ApiError(500, error.message);

  if (input.appliesTo != null || input.productIds || input.categoryIds) {
    const next = await getPromotion(id);
    const appliesTo = input.appliesTo ?? next.applies_to;
    await replaceScope(
      "promotion_products",
      "promotion_id",
      id,
      appliesTo === "products" ? (input.productIds ?? next.product_ids) : [],
      "product_id",
    );
    await replaceScope(
      "promotion_categories",
      "promotion_id",
      id,
      appliesTo === "categories" ? (input.categoryIds ?? next.category_ids) : [],
      "category_id",
    );
  }

  return getPromotion(id);
}

export async function deletePromotion(id: string) {
  await getPromotion(id);
  const supabase = createAdminClient();
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw new ApiError(500, error.message);
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingColumnError(error) || error.code === "42P01") return [];
    throw new ApiError(500, error.message);
  }

  const ids = (data ?? []).map((row) => row.id as string);
  const [{ data: products }, { data: categories }, { data: redemptions }] =
    await Promise.all([
      ids.length
        ? supabase
            .from("promo_code_products")
            .select("promo_code_id, product_id")
            .in("promo_code_id", ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from("promo_code_categories")
            .select("promo_code_id, category_id")
            .in("promo_code_id", ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from("promo_code_redemptions")
            .select("promo_code_id")
            .in("promo_code_id", ids)
        : Promise.resolve({ data: [] }),
    ]);

  const productsBy = new Map<string, string[]>();
  const categoriesBy = new Map<string, string[]>();
  const usedBy = new Map<string, number>();
  for (const row of products ?? []) {
    const list = productsBy.get(row.promo_code_id) ?? [];
    list.push(row.product_id);
    productsBy.set(row.promo_code_id, list);
  }
  for (const row of categories ?? []) {
    const list = categoriesBy.get(row.promo_code_id) ?? [];
    list.push(row.category_id);
    categoriesBy.set(row.promo_code_id, list);
  }
  for (const row of redemptions ?? []) {
    usedBy.set(row.promo_code_id, (usedBy.get(row.promo_code_id) ?? 0) + 1);
  }

  return ((data ?? []) as PromoCodeRow[]).map((row) => ({
    ...row,
    product_ids: productsBy.get(row.id) ?? [],
    category_ids: categoriesBy.get(row.id) ?? [],
    used_count: usedBy.get(row.id) ?? 0,
  }));
}

async function getPromoCode(id: string): Promise<PromoCode> {
  const items = await listPromoCodes();
  const found = items.find((item) => item.id === id);
  if (!found) throw new ApiError(404, "Промокод не знайдено");
  return found;
}

export async function findPromoCodeByCode(code: string): Promise<PromoCode | null> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;
  const items = await listPromoCodes();
  return (
    items.find((item) => item.code.toUpperCase() === normalized) ?? null
  );
}

export async function createPromoCode(input: PromoCodeInput): Promise<PromoCode> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: normalizePromoCode(input.code),
      description: input.description ?? "",
      discount_type: input.discountType,
      discount_value: input.discountValue,
      min_order_uah: input.minOrderUah ?? 0,
      max_discount_uah: input.maxDiscountUah ?? null,
      usage_limit: input.usageLimit ?? null,
      usage_limit_per_user: input.usageLimitPerUser ?? null,
      starts_at: emptyIso(input.startsAt),
      ends_at: emptyIso(input.endsAt),
      is_active: input.isActive ?? true,
      first_order_only: input.firstOrderOnly ?? false,
      combinable_with_sale: input.combinableWithSale ?? true,
      applies_to: input.appliesTo,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") {
      throw new ApiError(409, "Такий промокод уже існує");
    }
    throw new ApiError(500, error?.message ?? "Не вдалося створити промокод");
  }

  try {
    if (input.appliesTo === "products") {
      await replaceScope(
        "promo_code_products",
        "promo_code_id",
        data.id,
        input.productIds ?? [],
        "product_id",
      );
    }
    if (input.appliesTo === "categories") {
      await replaceScope(
        "promo_code_categories",
        "promo_code_id",
        data.id,
        input.categoryIds ?? [],
        "category_id",
      );
    }
  } catch (err) {
    await supabase.from("promo_codes").delete().eq("id", data.id);
    throw err;
  }

  return getPromoCode(data.id);
}

export async function updatePromoCode(
  id: string,
  input: Partial<PromoCodeInput>,
): Promise<PromoCode> {
  await getPromoCode(id);
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.code != null) patch.code = normalizePromoCode(input.code);
  if (input.description != null) patch.description = input.description;
  if (input.discountType != null) patch.discount_type = input.discountType;
  if (input.discountValue != null) patch.discount_value = input.discountValue;
  if (input.minOrderUah != null) patch.min_order_uah = input.minOrderUah;
  if (input.maxDiscountUah !== undefined) {
    patch.max_discount_uah = input.maxDiscountUah;
  }
  if (input.usageLimit !== undefined) patch.usage_limit = input.usageLimit;
  if (input.usageLimitPerUser !== undefined) {
    patch.usage_limit_per_user = input.usageLimitPerUser;
  }
  if (input.startsAt !== undefined) patch.starts_at = emptyIso(input.startsAt);
  if (input.endsAt !== undefined) patch.ends_at = emptyIso(input.endsAt);
  if (input.isActive != null) patch.is_active = input.isActive;
  if (input.firstOrderOnly != null) patch.first_order_only = input.firstOrderOnly;
  if (input.combinableWithSale != null) {
    patch.combinable_with_sale = input.combinableWithSale;
  }
  if (input.appliesTo != null) patch.applies_to = input.appliesTo;

  const { error } = await supabase.from("promo_codes").update(patch).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      throw new ApiError(409, "Такий промокод уже існує");
    }
    throw new ApiError(500, error.message);
  }

  if (input.appliesTo != null || input.productIds || input.categoryIds) {
    const next = await getPromoCode(id);
    const appliesTo = input.appliesTo ?? next.applies_to;
    await replaceScope(
      "promo_code_products",
      "promo_code_id",
      id,
      appliesTo === "products" ? (input.productIds ?? next.product_ids) : [],
      "product_id",
    );
    await replaceScope(
      "promo_code_categories",
      "promo_code_id",
      id,
      appliesTo === "categories" ? (input.categoryIds ?? next.category_ids) : [],
      "category_id",
    );
  }

  return getPromoCode(id);
}

export async function deletePromoCode(id: string) {
  await getPromoCode(id);
  const supabase = createAdminClient();
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) throw new ApiError(500, error.message);
}

export async function countPromoUsage(promoCodeId: string, profileId?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promoCodeId);
  if (profileId) query = query.eq("profile_id", profileId);
  const { count, error } = await query;
  if (error) {
    if (isMissingColumnError(error) || error.code === "42P01") return 0;
    throw new ApiError(500, error.message);
  }
  return count ?? 0;
}

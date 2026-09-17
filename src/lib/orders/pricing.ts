import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  countPromoUsage,
  findPromoCodeByCode,
  listLivePromotions,
} from "@/lib/admin/marketing";
import {
  applyPromoToLines,
  bestPromotionForProduct,
  salePriceUah,
  type PricedLine,
} from "@/lib/pricing";
import type { PromoPreview } from "@/lib/types";

export async function priceCheckoutItems(
  items: Array<{ variantId: string; qty: number }>,
  opts: { profileId?: string; code?: string | null } = {},
): Promise<PromoPreview & { lines: PricedLine[] }> {
  const supabase = createAdminClient();
  const variantIds = [...new Set(items.map((item) => item.variantId))];
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, price_uah, stock, product:products(id, category_id, title, is_active)",
    )
    .in("id", variantIds);
  if (error) throw new ApiError(500, error.message);

  const byId = new Map((data ?? []).map((row) => [row.id as string, row]));
  const promotions = await listLivePromotions();
  const qtyBy = new Map<string, number>();
  for (const item of items) {
    qtyBy.set(item.variantId, (qtyBy.get(item.variantId) ?? 0) + item.qty);
  }

  const lines: PricedLine[] = [];
  for (const [variantId, qty] of qtyBy) {
    const variant = byId.get(variantId);
    const product = variant?.product as unknown as {
      id: string;
      category_id: string | null;
      title: string;
      is_active: boolean;
    } | null;
    if (!variant || !product?.is_active) {
      throw new ApiError(400, "Товар більше недоступний");
    }
    if ((variant.stock as number) < qty) {
      throw new ApiError(400, `Недостатньо на складі: ${product.title}`);
    }
    const listPrice = variant.price_uah as number;
    const promotion = bestPromotionForProduct(
      promotions,
      product.id,
      product.category_id,
      listPrice,
    );
    lines.push({
      variantId,
      productId: product.id,
      categoryId: product.category_id,
      qty,
      originalPriceUah: listPrice,
      unitPriceUah: salePriceUah(listPrice, promotion),
      stackWithPromo: promotion?.stack_with_promo ?? true,
    });
  }

  const subtotalUah = lines.reduce(
    (sum, line) => sum + line.unitPriceUah * line.qty,
    0,
  );

  let promo = null;
  if (opts.code?.trim()) {
    promo = await findPromoCodeByCode(opts.code);
    if (!promo) throw new ApiError(400, "Промокод не знайдено");
  }

  let usedCount = 0;
  let usedByUser = 0;
  let priorOrders = 0;
  if (promo) {
    usedCount = await countPromoUsage(promo.id);
    if (opts.profileId) {
      usedByUser = await countPromoUsage(promo.id, opts.profileId);
      const orders = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", opts.profileId)
        .neq("status", "cancelled");
      priorOrders = orders.count ?? 0;
    }
  }

  const applied = applyPromoToLines(lines, promo, {
    priorOrders,
    usedCount,
    usedByUser,
  });
  if (applied.error) throw new ApiError(400, applied.error);

  return {
    lines,
    subtotalUah,
    discountUah: applied.discountUah,
    totalUah: Math.max(0, subtotalUah - applied.discountUah),
    promoCode: promo?.code ?? null,
    message: promo
      ? `Знижка ${applied.discountUah} грн за кодом ${promo.code}`
      : null,
  };
}

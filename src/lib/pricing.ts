import type {
  AppliesTo,
  DiscountType,
  PromoCode,
  Promotion,
} from "@/lib/types";

export function computeDiscountUah(
  type: DiscountType,
  value: number,
  amount: number,
  max?: number | null,
) {
  if (amount <= 0 || value <= 0) return 0;
  const raw = type === "percent" ? Math.floor((amount * value) / 100) : value;
  const capped = max != null && max > 0 ? Math.min(raw, max) : raw;
  return Math.max(0, Math.min(amount, capped));
}

export function isScheduleLive(
  isActive: boolean,
  startsAt: string | null,
  endsAt: string | null,
  now = new Date(),
) {
  if (!isActive) return false;
  if (startsAt && new Date(startsAt) > now) return false;
  if (endsAt && new Date(endsAt) < now) return false;
  return true;
}

export function matchesScope(
  appliesTo: AppliesTo,
  productId: string,
  categoryId: string | null,
  productIds: string[],
  categoryIds: string[],
) {
  if (appliesTo === "all") return true;
  if (appliesTo === "products") return productIds.includes(productId);
  if (appliesTo === "categories") {
    return categoryId != null && categoryIds.includes(categoryId);
  }
  return false;
}

export function bestPromotionForProduct(
  promotions: Promotion[],
  productId: string,
  categoryId: string | null,
  listPrice: number,
) {
  const candidates = promotions.filter(
    (promotion) =>
      isScheduleLive(promotion.is_active, promotion.starts_at, promotion.ends_at) &&
      matchesScope(
        promotion.applies_to,
        productId,
        categoryId,
        promotion.product_ids,
        promotion.category_ids,
      ),
  );
  if (!candidates.length) return null;

  return [...candidates].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return (
      computeDiscountUah(b.discount_type, b.discount_value, listPrice) -
      computeDiscountUah(a.discount_type, a.discount_value, listPrice)
    );
  })[0];
}

export function salePriceUah(
  listPrice: number,
  promotion: Pick<Promotion, "discount_type" | "discount_value"> | null,
) {
  if (!promotion) return listPrice;
  return Math.max(
    0,
    listPrice -
      computeDiscountUah(promotion.discount_type, promotion.discount_value, listPrice),
  );
}

export function formatDiscountLabel(
  type: DiscountType,
  value: number,
) {
  return type === "percent" ? `-${value}%` : `-${value} грн`;
}

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase();
}

export type PricedLine = {
  variantId: string;
  productId: string;
  categoryId: string | null;
  qty: number;
  originalPriceUah: number;
  unitPriceUah: number;
  stackWithPromo: boolean;
};

export function applyPromoToLines(
  lines: PricedLine[],
  promo: PromoCode | null,
  opts: { priorOrders: number; usedCount: number; usedByUser: number },
): { discountUah: number; error: string | null } {
  if (!promo) return { discountUah: 0, error: null };

  if (!isScheduleLive(promo.is_active, promo.starts_at, promo.ends_at)) {
    return { discountUah: 0, error: "Промокод зараз не діє" };
  }
  if (promo.usage_limit != null && opts.usedCount >= promo.usage_limit) {
    return { discountUah: 0, error: "Ліміт використання промокоду вичерпано" };
  }
  if (
    promo.usage_limit_per_user != null &&
    opts.usedByUser >= promo.usage_limit_per_user
  ) {
    return { discountUah: 0, error: "Ви вже використали цей промокод" };
  }
  if (promo.first_order_only && opts.priorOrders > 0) {
    return { discountUah: 0, error: "Промокод лише для першого замовлення" };
  }

  const eligible = lines.filter((line) => {
    if (!line.stackWithPromo) return false;
    return matchesScope(
      promo.applies_to,
      line.productId,
      line.categoryId,
      promo.product_ids,
      promo.category_ids,
    );
  });

  const saleConflict = eligible.some((line) => {
    const onSale = line.unitPriceUah < line.originalPriceUah;
    return onSale && (!promo.combinable_with_sale || !line.stackWithPromo);
  });
  if (saleConflict) {
    return { discountUah: 0, error: "Промокод не поєднується з акцією" };
  }

  const eligibleUah = eligible.reduce(
    (sum, line) => sum + line.unitPriceUah * line.qty,
    0,
  );
  if (eligibleUah <= 0) {
    return { discountUah: 0, error: "Промокод не застосовується до товарів у кошику" };
  }
  if (eligibleUah < promo.min_order_uah) {
    return { discountUah: 0, error: "Мінімальна сума для промокоду не досягнута" };
  }

  return {
    discountUah: computeDiscountUah(
      promo.discount_type,
      promo.discount_value,
      eligibleUah,
      promo.max_discount_uah,
    ),
    error: null,
  };
}

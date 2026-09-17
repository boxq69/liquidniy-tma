import { z } from "zod";

export const cartItemSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(99),
});

export const cartPayloadSchema = z.object({
  items: z.array(cartItemSchema).max(50),
});

export const novaPoshtaDeliverySchema = z.object({
  cityRef: z.string().trim().min(1, "Оберіть місто"),
  cityName: z.string().trim().min(1),
  cityArea: z.string().trim(),
  warehouseRef: z.string().trim().min(1, "Оберіть відділення"),
  warehouseNumber: z.string().trim().min(1),
  warehouseDescription: z.string().trim().min(1),
  warehouseAddress: z.string().trim(),
  warehouseCategory: z.enum(["Warehouse", "Postomat", "Store", "Other"]),
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Вкажіть імʼя").max(100),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{10,20}$/, "Невірний номер телефону"),
  novaPoshta: novaPoshtaDeliverySchema,
  comment: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["card", "qr", "phone"]),
  promoCode: z.string().trim().max(40).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
});

export const productVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  size: z.string().trim().min(1).max(20),
  color: z.string().trim().min(1).max(40),
  priceUah: z.number().int().min(0),
  stock: z.number().int().min(0),
  sku: z.string().trim().max(60).optional().nullable(),
});

export const productInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: лише латиниця, цифри, дефіс"),
  description: z.string().trim().max(4000).default(""),
  categoryId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  imageUrls: z.array(z.string().url()).max(10).default([]),
  variants: z.array(productVariantInputSchema).min(1),
});

export const orderStatusSchema = z.enum([
  "new",
  "processing",
  "done",
  "cancelled",
]);

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  showOnHome: z.boolean().default(true),
});

export const categoryPatchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
});

export const productPatchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: лише латиниця, цифри, дефіс")
    .optional(),
  description: z.string().trim().max(4000).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
  variants: z.array(productVariantInputSchema).min(1).optional(),
});

export const orderStatusPatchSchema = z.object({
  status: orderStatusSchema,
});

export const adminUserPatchSchema = z.object({
  isBlocked: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});

const discountTypeSchema = z.enum(["percent", "fixed"]);
const appliesToSchema = z.enum(["all", "categories", "products"]);

const discountFields = {
  discountType: discountTypeSchema,
  discountValue: z.number().int().min(1),
  appliesTo: appliesToSchema.default("all"),
  productIds: z.array(z.string().uuid()).default([]),
  categoryIds: z.array(z.string().uuid()).default([]),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
};

function refineDiscount(
  value: { discountType: "percent" | "fixed"; discountValue: number },
  ctx: z.RefinementCtx,
) {
  if (value.discountType === "percent" && value.discountValue > 100) {
    ctx.addIssue({
      code: "custom",
      message: "Відсоток має бути від 1 до 100",
      path: ["discountValue"],
    });
  }
}

function refineScope(
  value: {
    appliesTo: "all" | "categories" | "products";
    productIds: string[];
    categoryIds: string[];
  },
  ctx: z.RefinementCtx,
) {
  if (value.appliesTo === "products" && value.productIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Оберіть хоча б один товар",
      path: ["productIds"],
    });
  }
  if (value.appliesTo === "categories" && value.categoryIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Оберіть хоча б одну категорію",
      path: ["categoryIds"],
    });
  }
}

const promotionFields = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).default(""),
  badgeText: z.string().trim().max(24).default(""),
  stackWithPromo: z.boolean().default(true),
  priority: z.number().int().min(0).max(999).default(0),
  ...discountFields,
});

export const promotionInputSchema = promotionFields.superRefine((value, ctx) => {
  refineDiscount(value, ctx);
  refineScope(value, ctx);
});

export const promotionPatchSchema = promotionFields.partial();

const promoCodeFields = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Лише латиниця, цифри, _ і -"),
  description: z.string().trim().max(400).default(""),
  minOrderUah: z.number().int().min(0).default(0),
  maxDiscountUah: z.number().int().min(1).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  usageLimitPerUser: z.number().int().min(1).nullable().optional(),
  firstOrderOnly: z.boolean().default(false),
  combinableWithSale: z.boolean().default(true),
  ...discountFields,
});

export const promoCodeInputSchema = promoCodeFields.superRefine((value, ctx) => {
  refineDiscount(value, ctx);
  refineScope(value, ctx);
});

export const promoCodePatchSchema = promoCodeFields.partial();

export const promoPreviewSchema = z.object({
  code: z.string().trim().max(40).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
});

export const telegramAuthSchema = z.object({
  initData: z.string().min(1, "initData required"),
});

export const favoriteProductIdSchema = z.object({
  productId: z.string().uuid(),
});

export const favoritesPayloadSchema = z.object({
  productIds: z.array(z.string().uuid()).max(200),
});

export const bannerPatchSchema = z.object({
  imageUrl: z.string().trim().min(1).max(500).optional(),
  href: z.string().trim().min(1).max(300).optional(),
  title: z.string().trim().max(120).optional(),
  isActive: z.boolean().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type NovaPoshtaDelivery = z.infer<typeof novaPoshtaDeliverySchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductPatch = z.infer<typeof productPatchSchema>;
export type CartPayload = z.infer<typeof cartPayloadSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type FavoritesPayload = z.infer<typeof favoritesPayloadSchema>;
export type PromotionInput = z.infer<typeof promotionInputSchema>;
export type PromotionPatch = z.infer<typeof promotionPatchSchema>;
export type PromoCodeInput = z.infer<typeof promoCodeInputSchema>;
export type PromoCodePatch = z.infer<typeof promoCodePatchSchema>;
export type PromoPreviewInput = z.infer<typeof promoPreviewSchema>;

import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { listLivePromotions } from "@/lib/admin/marketing";
import { bestPromotionForProduct, salePriceUah } from "@/lib/pricing";
import type { CartLine } from "@/lib/types";
import type { CartPayload } from "@/lib/validations/schemas";

async function getOrCreateCartId(profileId: string) {
  const supabase = createAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("carts")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (readError) throw new ApiError(500, readError.message);
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("carts")
    .insert({ profile_id: profileId })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: again } = await supabase
        .from("carts")
        .select("id")
        .eq("profile_id", profileId)
        .maybeSingle();
      if (again?.id) return again.id as string;
    }
    throw new ApiError(500, error.message);
  }
  return created.id as string;
}

export async function getCartLines(profileId: string): Promise<CartLine[]> {
  const supabase = createAdminClient();
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (cartError) throw new ApiError(500, cartError.message);
  if (!cart) return [];

  const { data: items, error } = await supabase
    .from("cart_items")
    .select(
      `
      qty,
      variant:product_variants (
        id,
        size,
        color,
        price_uah,
        stock,
        product:products (
          id,
          title,
          slug,
          is_active,
          category_id,
          images:product_images ( url, sort_order )
        )
      )
    `,
    )
    .eq("cart_id", cart.id);

  if (error) throw new ApiError(500, error.message);

  let promotions: Awaited<ReturnType<typeof listLivePromotions>> = [];
  try {
    promotions = await listLivePromotions();
  } catch {
    promotions = [];
  }

  const lines: CartLine[] = [];
  for (const row of items ?? []) {
    const variant = row.variant as unknown as {
      id: string;
      size: string;
      color: string;
      price_uah: number;
      stock: number;
      product: {
        id: string;
        title: string;
        slug: string;
        is_active: boolean;
        category_id: string | null;
        images: { url: string; sort_order: number }[] | null;
      } | null;
    } | null;

    if (!variant?.product?.is_active) continue;

    const images = [...(variant.product.images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const promotion = bestPromotionForProduct(
      promotions,
      variant.product.id,
      variant.product.category_id,
      variant.price_uah,
    );

    lines.push({
      variantId: variant.id,
      qty: row.qty,
      productId: variant.product.id,
      title: variant.product.title,
      slug: variant.product.slug,
      size: variant.size,
      color: variant.color,
      priceUah: salePriceUah(variant.price_uah, promotion),
      stock: variant.stock,
      imageUrl: images[0]?.url ?? null,
    });
  }

  return lines;
}

export async function replaceCart(
  profileId: string,
  payload: CartPayload,
): Promise<CartLine[]> {
  const supabase = createAdminClient();
  const cartId = await getOrCreateCartId(profileId);

  const merged = new Map<string, number>();
  for (const item of payload.items) {
    merged.set(
      item.variantId,
      Math.min(99, (merged.get(item.variantId) ?? 0) + item.qty),
    );
  }
  const items = [...merged.entries()].map(([variantId, qty]) => ({
    variantId,
    qty,
  }));

  const variantIds = items.map((i) => i.variantId);
  if (variantIds.length) {
    const { data: variants, error } = await supabase
      .from("product_variants")
      .select("id, stock, product:products(is_active)")
      .in("id", variantIds);

    if (error) throw new ApiError(500, error.message);

    const byId = new Map((variants ?? []).map((v) => [v.id as string, v]));
    for (const item of items) {
      const variant = byId.get(item.variantId);
      if (!variant) {
        throw new ApiError(400, `Невідомий товар: ${item.variantId}`);
      }
      const product = variant.product as unknown as { is_active: boolean } | null;
      if (!product?.is_active) {
        throw new ApiError(400, "Товар більше недоступний");
      }
      if ((variant.stock as number) < item.qty) {
        throw new ApiError(400, "Недостатньо на складі");
      }
    }
  }

  const { error: delError } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cartId);
  if (delError) throw new ApiError(500, delError.message);

  if (items.length) {
    const { error } = await supabase.from("cart_items").insert(
      items.map((item) => ({
        cart_id: cartId,
        variant_id: item.variantId,
        qty: item.qty,
      })),
    );
    if (error) throw new ApiError(500, error.message);
  }

  await supabase
    .from("carts")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", cartId);

  return getCartLines(profileId);
}

export async function clearCart(profileId: string) {
  await replaceCart(profileId, { items: [] });
}

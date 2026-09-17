import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductById, listProducts } from "@/lib/catalog/queries";
import type { ProductWithDetails } from "@/lib/types";

export async function listFavoriteProducts(
  profileId: string,
): Promise<ProductWithDetails[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("product_id, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(500, error.message);

  const ids = (data ?? []).map((row) => row.product_id as string);
  if (!ids.length) return [];

  const products = await listProducts({}, { includeInactive: false });
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids
    .map((id) => byId.get(id))
    .filter((product): product is ProductWithDetails => Boolean(product));
}

export async function replaceFavorites(
  profileId: string,
  productIds: string[],
): Promise<ProductWithDetails[]> {
  const uniqueIds = [...new Set(productIds)];
  await assertActiveProducts(uniqueIds);

  const supabase = createAdminClient();
  const { error: delError } = await supabase
    .from("favorites")
    .delete()
    .eq("profile_id", profileId);
  if (delError) throw new ApiError(500, delError.message);

  if (uniqueIds.length) {
    const { error } = await supabase.from("favorites").insert(
      uniqueIds.map((productId) => ({
        profile_id: profileId,
        product_id: productId,
      })),
    );
    if (error) throw new ApiError(500, error.message);
  }

  return listFavoriteProducts(profileId);
}

export async function addFavorite(profileId: string, productId: string) {
  await assertActiveProducts([productId]);
  const supabase = createAdminClient();
  const { error } = await supabase.from("favorites").upsert(
    { profile_id: profileId, product_id: productId },
    { onConflict: "profile_id,product_id" },
  );
  if (error) throw new ApiError(500, error.message);
  return listFavoriteProducts(profileId);
}

export async function removeFavorite(profileId: string, productId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("profile_id", profileId)
    .eq("product_id", productId);
  if (error) throw new ApiError(500, error.message);
  return listFavoriteProducts(profileId);
}

async function assertActiveProducts(productIds: string[]) {
  if (!productIds.length) return;
  for (const id of productIds) {
    const product = await getProductById(id);
    if (!product?.is_active) {
      throw new ApiError(400, "Товар більше недоступний");
    }
  }
}

import { getProductBySlug } from "@/lib/catalog/queries";
import { toProductDetail } from "@/lib/catalog/map";

export async function getShopProductDetail(slug: string) {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  return toProductDetail(product);
}

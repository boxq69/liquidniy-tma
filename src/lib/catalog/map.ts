import { salePriceUah } from "@/lib/pricing";
import type { ProductWithDetails } from "@/lib/types";
import type { ProductCard, ProductDetail } from "@/lib/catalog/types";

export function toProductCard(product: ProductWithDetails): ProductCard {
  const listPrice = product.min_price ?? 0;
  const salePrice = product.sale_price ?? listPrice;
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: product.category?.name ?? "",
    categorySlug: product.category?.slug ?? "",
    imageUrl: product.images[0]?.url ?? "",
    priceUah: salePrice,
    oldPriceUah: salePrice < listPrice ? listPrice : undefined,
    isHotDeal: product.is_featured || salePrice < listPrice,
    inStock: Boolean(product.in_stock),
  };
}

export function toProductDetail(product: ProductWithDetails): ProductDetail {
  const card = toProductCard(product);
  return {
    ...card,
    description: product.description,
    images: product.images.map((image) => image.url).filter(Boolean),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      color: variant.color,
      priceUah: salePriceUah(variant.price_uah, product.promotion ?? null),
      stock: variant.stock,
    })),
  };
}

export function getDiscountPercent(product: Pick<ProductCard, "priceUah" | "oldPriceUah">) {
  if (!product.oldPriceUah || product.oldPriceUah <= product.priceUah) {
    return null;
  }
  return Math.round(
    ((product.oldPriceUah - product.priceUah) / product.oldPriceUah) * 100,
  );
}

export function asFavoriteCard(product: ProductCard): ProductCard {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    categorySlug: product.categorySlug,
    imageUrl: product.imageUrl,
    priceUah: product.priceUah,
    oldPriceUah: product.oldPriceUah,
    isHotDeal: product.isHotDeal,
    inStock: product.inStock,
  };
}

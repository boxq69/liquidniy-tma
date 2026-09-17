export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  categorySlug: string;
  imageUrl: string;
  priceUah: number;
  oldPriceUah?: number;
  isHotDeal?: boolean;
  inStock: boolean;
};

export type ProductVariantOption = {
  id: string;
  size: string;
  color: string;
  priceUah: number;
  stock: number;
};

export type ProductDetail = ProductCard & {
  description: string;
  images: string[];
  variants: ProductVariantOption[];
};

export type CartItem = {
  variantId: string;
  qty: number;
  productId: string;
  title: string;
  slug: string;
  size: string;
  color: string;
  priceUah: number;
  oldPriceUah?: number;
  stock: number;
  imageUrl: string | null;
};

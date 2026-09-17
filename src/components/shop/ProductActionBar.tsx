"use client";

import { useRouter } from "next/navigation";
import { IconShoppingCart } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart/store";
import { navigateWhenReady } from "@/lib/telegram/webapp-client";
import { formatPrice } from "@/lib/utils/app";
import { cn } from "@/lib/utils";
import type { ProductDetail, ProductVariantOption } from "@/lib/catalog/types";

type ProductActionBarProps = {
  product: ProductDetail;
  selectedVariant: ProductVariantOption | undefined;
  qty: number;
};

export function ProductActionBar({
  product,
  selectedVariant,
  qty,
}: ProductActionBarProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const price = (selectedVariant?.priceUah ?? product.priceUah) * qty;

  const addToCart = () => {
    if (!product.inStock) {
      toast.error("Товару немає в наявності");
      return false;
    }
    if (!selectedVariant) {
      toast.error("Оберіть розмір");
      return false;
    }
    if (selectedVariant.stock <= 0) {
      toast.error("Цей розмір недоступний");
      return false;
    }
    addItem(
      {
        variantId: selectedVariant.id,
        productId: product.id,
        title: product.title,
        slug: product.slug,
        size: selectedVariant.size,
        color: selectedVariant.color,
        priceUah: selectedVariant.priceUah,
        oldPriceUah: product.oldPriceUah,
        stock: selectedVariant.stock,
        imageUrl: product.imageUrl || null,
      },
      qty,
    );
    toast.success("Додано в кошик");
    return true;
  };

  const buyNow = () => {
    if (!addToCart()) return;
    navigateWhenReady(() => router.push("/checkout"));
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className={cn(
          "pointer-events-auto flex flex-col gap-3 rounded-[1.75rem] border border-white/10",
          "bg-card p-3 shadow-lg",
        )}
      >
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{product.title}</p>
            {selectedVariant ? (
              <p className="text-xs text-muted-foreground">
                {selectedVariant.size}
                {qty > 1 ? ` · ${qty} шт.` : null}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Оберіть розмір</p>
            )}
          </div>
          <p className="shrink-0 text-sm font-bold tabular-nums">
            {formatPrice(price)}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-12 flex-1 rounded-full gap-2"
            onClick={addToCart}
          >
            <IconShoppingCart data-icon="inline-start" />
            У кошик
          </Button>
          <Button
            type="button"
            className="h-12 flex-1 rounded-full"
            onClick={buyNow}
          >
            Купити
          </Button>
        </div>
      </div>
    </div>
  );
}

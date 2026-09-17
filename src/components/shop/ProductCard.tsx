import Image from "next/image";
import Link from "next/link";
import { getDiscountPercent } from "@/lib/catalog/map";
import type { ProductCard as ProductCardData } from "@/lib/catalog/types";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { formatPrice } from "@/lib/utils/app";

export function ProductCard({ product }: { product: ProductCardData }) {
  const discount = getDiscountPercent(product);

  return (
    <article className="relative flex w-full flex-col gap-2">
      <Link href={`/product/${product.slug}`} prefetch={false} className="block w-full">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
          {discount ? (
            <Badge variant="secondary" className="absolute top-2 left-2 z-10">
              -{discount}%
            </Badge>
          ) : null}

          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-cover"
              sizes="160px"
              draggable={false}
            />
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-medium">
          {product.title.length > 13
            ? product.title.slice(0, 13) + "..."
            : product.title}
        </h3>

        <p className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold">{formatPrice(product.priceUah)}</span>
          {product.oldPriceUah ? (
            <span className="text-muted-foreground line-through">
              {formatPrice(product.oldPriceUah)}
            </span>
          ) : null}
        </p>
      </Link>

      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton product={product} />
      </div>
    </article>
  );
}

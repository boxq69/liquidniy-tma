"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconMinus,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useCartStore } from "@/lib/cart/store";
import { api } from "@/lib/api/client";
import { toProductCard } from "@/lib/catalog/map";
import type { ProductCard } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/utils/app";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTelegram } from "@/components/providers/telegram-provider";
import { navigateWhenReady } from "@/lib/telegram/webapp-client";
import { ScrollRail } from "@/components/shop/scroll-rail";

export function CartView() {
  const router = useRouter();
  const { isTelegram } = useTelegram();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const clear = useCartStore((s) => s.clear);
  const [upsell, setUpsell] = useState<ProductCard[]>([]);

  const totalUah = items.reduce((sum, item) => sum + item.priceUah * item.qty, 0);

  useEffect(() => {
    let cancelled = false;
    void api
      .products({ featured: true })
      .then(({ items: products }) => {
        if (cancelled) return;
        const inCart = new Set(items.map((item) => item.slug));
        setUpsell(
          products
            .map(toProductCard)
            .filter((product) => !inCart.has(product.slug))
            .slice(0, 8),
        );
      })
      .catch(() => {
        if (!cancelled) setUpsell([]);
      });
    return () => {
      cancelled = true;
    };
  }, [items]);

  return (
    <div className="flex min-h-full flex-col pb-36">
      <header className="flex items-center justify-between px-4 py-3">
        {isTelegram ? (
          <span className="size-10" aria-hidden />
        ) : (
          <button
            type="button"
            onClick={() => navigateWhenReady(() => router.back())}
            aria-label="Назад"
            className="inline-flex size-10 items-center justify-center rounded-full"
          >
            <IconArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold">Кошик</h1>
        <button
          type="button"
          onClick={clear}
          aria-label="Очистити кошик"
          disabled={items.length === 0}
          className="inline-flex size-10 items-center justify-center rounded-full disabled:opacity-40"
        >
          <IconTrash className="size-5" />
        </button>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-muted-foreground">Кошик порожній</p>
          <Link href="/" className={cn(buttonVariants(), "rounded-full")}>
            До каталогу
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3 px-4">
            {items.map((line) => (
              <li
                key={line.variantId}
                className="flex items-center gap-3 rounded-2xl bg-card p-3"
              >
                <Link
                  href={`/product/${line.slug}`}
                  className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  {line.imageUrl ? (
                    <Image
                      src={line.imageUrl}
                      alt={line.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${line.slug}`}
                    className="line-clamp-2 text-sm font-medium"
                  >
                    {line.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Розмір {line.size}
                  </p>
                  <p className="mt-1 flex items-baseline gap-2 text-sm">
                    <span className="font-semibold">
                      {formatPrice(line.priceUah)}
                    </span>
                    {line.oldPriceUah ? (
                      <span className="text-muted-foreground line-through">
                        {formatPrice(line.oldPriceUah)}
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-xl bg-muted px-1">
                  <button
                    type="button"
                    aria-label="Зменшити"
                    onClick={() => setQty(line.variantId, line.qty - 1)}
                    className="inline-flex size-8 items-center justify-center"
                  >
                    <IconMinus className="size-4" />
                  </button>
                  <span className="min-w-5 text-center text-sm font-semibold tabular-nums">
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Збільшити"
                    disabled={line.qty >= line.stock}
                    onClick={() => setQty(line.variantId, line.qty + 1)}
                    className="inline-flex size-8 items-center justify-center disabled:opacity-40"
                  >
                    <IconPlus className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm font-medium text-primary">
              Додати ще товари
            </Link>
          </div>

          {upsell.length > 0 ? (
            <section className="mt-6 px-4" aria-labelledby="upsell-title">
              <h2
                id="upsell-title"
                className="mb-3 text-sm text-muted-foreground"
              >
                Додайте до замовлення
              </h2>
              <ScrollRail>
                <ul className="flex w-max gap-3">
                  {upsell.map((product) => (
                    <li key={product.id} className="w-28 shrink-0">
                      <Link href={`/product/${product.slug}`} className="block">
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.title}
                              fill
                              draggable={false}
                              className="object-cover"
                              sizes="112px"
                            />
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-medium">
                          {formatPrice(product.priceUah)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </ScrollRail>
            </section>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="rounded-[1.75rem] border border-white/10 bg-card p-3 shadow-lg">
              <div className="mb-3 flex items-center justify-between px-1 text-sm">
                <span className="text-muted-foreground">Разом:</span>
                <span className="font-bold tabular-nums">
                  {formatPrice(totalUah)}
                </span>
              </div>
              <Button
                type="button"
                className="h-12 w-full rounded-full"
                onClick={() => navigateWhenReady(() => router.push("/checkout"))}
              >
                Далі
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

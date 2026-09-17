"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  IconChevronLeft,
  IconChevronRight,
  IconMinus,
  IconPlus,
  IconShare,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Bestsellers from "@/components/shop/Bestsellers";
import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { ProductActionBar } from "@/components/shop/ProductActionBar";
import { ScrollRail } from "@/components/shop/scroll-rail";
import { formatPrice } from "@/lib/utils/app";
import { cn } from "@/lib/utils";
import type { ProductCard, ProductDetail } from "@/lib/catalog/types";

type ProductViewProps = {
  product: ProductDetail;
  related?: ProductCard[];
};

export function ProductView({ product, related }: ProductViewProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.variants.length === 1 ? product.variants[0].size : null,
  );
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const selectedVariant = product.variants.find((v) => v.size === selectedSize);
  const maxQty = selectedVariant?.stock ?? 0;
  const imageCount = product.images.length;

  const selectSize = (size: string) => {
    setSelectedSize(size);
    setQty(1);
  };

  const syncIndexFromScroll = (el: HTMLDivElement) => {
    const index = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    const next = Math.min(imageCount - 1, Math.max(0, index));
    setActiveImage((prev) => (prev === next ? prev : next));
  };

  const scrollToImage = (
    el: HTMLDivElement | null,
    index: number,
    behavior: ScrollBehavior = "smooth",
  ) => {
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior });
  };

  const openLightbox = (index: number) => {
    setActiveImage(index);
    setLightboxOpen(true);
  };

  const goToImage = (index: number) => {
    const next = Math.min(imageCount - 1, Math.max(0, index));
    setActiveImage(next);
    scrollToImage(scrollerRef.current, next);
    scrollToImage(lightboxRef.current, next);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const id = window.requestAnimationFrame(() => {
      scrollToImage(lightboxRef.current, activeImage, "auto");
    });
    return () => window.cancelAnimationFrame(id);
    // Sync only on open. Swipe updates the index from scroll, not the other way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen]);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Посилання скопійовано");
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <article className="flex min-h-full flex-col">
      <div className="relative px-4 pt-4">
        <ScrollRail
          ref={scrollerRef}
          onScroll={(event) => syncIndexFromScroll(event.currentTarget)}
          className="flex snap-x snap-mandatory rounded-2xl"
        >
          {product.images.length ? (
            product.images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => openLightbox(index)}
              className="relative aspect-square w-full shrink-0 snap-center overflow-hidden rounded-2xl bg-muted"
              aria-label={`Відкрити фото ${index + 1}`}
            >
              <Image
                src={src}
                alt={`${product.title} — фото ${index + 1}`}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="(max-width: 448px) 100vw, 448px"
                draggable={false}
              />
            </button>
            ))
          ) : (
            <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-muted" />
          )}
        </ScrollRail>

        {imageCount > 1 ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-14 flex justify-center gap-1.5">
            {product.images.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  index === activeImage ? "bg-primary" : "bg-foreground/30",
                )}
              />
            ))}
          </div>
        ) : null}

        <div className="absolute right-7 bottom-7 z-20 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Поділитися"
            className="rounded-full bg-background"
            onClick={handleShare}
          >
            <IconShare />
          </Button>
          <FavoriteButton product={product} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 pt-4 pb-4">
        <header className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight">{product.title}</h1>
          <p className="shrink-0 text-xl font-bold">
            {formatPrice(selectedVariant?.priceUah ?? product.priceUah)}
          </p>
        </header>

        {product.oldPriceUah ? (
          <p className="-mt-3 text-sm text-muted-foreground line-through">
            {formatPrice(product.oldPriceUah)}
          </p>
        ) : null}

        <p className="text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        <section className="flex flex-col gap-3" aria-labelledby="size-label">
          <h2 id="size-label" className="text-base font-semibold">
            Розмір
          </h2>
          <ScrollRail className="pb-1">
            <ul className="flex w-max gap-2">
            {product.variants.map((variant) => {
              const disabled = variant.stock <= 0;
              const selected = selectedSize === variant.size;
              return (
                <li key={variant.id} className="shrink-0">
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => selectSize(variant.size)}
                    className={cn(
                      "min-w-12 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      selected
                        ? "border-primary bg-transparent text-foreground"
                        : "border-transparent bg-muted text-muted-foreground",
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {variant.size}
                  </button>
                </li>
              );
            })}
            </ul>
          </ScrollRail>

          {selectedVariant ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Available items: {selectedVariant.stock} pcs.
              </p>
              <div className="flex h-12 items-center justify-between rounded-full bg-muted px-2">
                <button
                  type="button"
                  aria-label="Зменшити кількість"
                  disabled={qty <= 1}
                  onClick={() => setQty((value) => Math.max(1, value - 1))}
                  className="inline-flex size-10 items-center justify-center rounded-full text-foreground disabled:opacity-40"
                >
                  <IconMinus className="size-5" />
                </button>
                <span className="min-w-8 text-center text-base font-semibold tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label="Збільшити кількість"
                  disabled={qty >= maxQty}
                  onClick={() =>
                    setQty((value) => Math.min(maxQty, value + 1))
                  }
                  className="inline-flex size-10 items-center justify-center rounded-full text-foreground disabled:opacity-40"
                >
                  <IconPlus className="size-5" />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="mt-2 px-2 pb-36">
        <Bestsellers
          title="Вам також сподобається"
          excludeSlug={product.slug}
          showSeeAll={false}
          products={related}
        />
      </div>

      <ProductActionBar
        product={product}
        selectedVariant={selectedVariant}
        qty={qty}
      />

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          fullscreen
          showCloseButton={false}
          className="gap-0"
        >
          <DialogTitle className="sr-only">{product.title}</DialogTitle>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-3 pt-[max(0.75rem,var(--app-safe-top))]">
              <Badge variant="secondary">
                {activeImage + 1} / {imageCount}
              </Badge>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Закрити"
                    className="rounded-full"
                  />
                }
              >
                <IconX />
              </DialogClose>
            </div>

            <div className="relative min-h-0 flex-1">
              <ScrollRail
                ref={lightboxRef}
                onScroll={(event) =>
                  syncIndexFromScroll(event.currentTarget)
                }
                className="flex h-full snap-x snap-mandatory"
              >
                {product.images.map((src, index) => (
                  <div
                    key={`${src}-full-${index}`}
                    className="relative h-full w-full shrink-0 snap-center"
                  >
                    <Image
                      src={src}
                      alt={`${product.title} — фото ${index + 1}`}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      priority={index === activeImage}
                    />
                  </div>
                ))}
              </ScrollRail>

              {imageCount > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Попереднє фото"
                    className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full"
                    disabled={activeImage === 0}
                    onClick={() => goToImage(activeImage - 1)}
                  >
                    <IconChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Наступне фото"
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full"
                    disabled={activeImage === imageCount - 1}
                    onClick={() => goToImage(activeImage + 1)}
                  >
                    <IconChevronRight />
                  </Button>
                </>
              ) : null}
            </div>

            {imageCount > 1 ? (
              <ScrollRail className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex w-max gap-2">
                {product.images.map((src, index) => (
                  <button
                    key={`${src}-thumb-${index}`}
                    type="button"
                    aria-label={`Фото ${index + 1}`}
                    aria-current={index === activeImage}
                    onClick={() => goToImage(index)}
                    className={cn(
                      "relative size-16 shrink-0 overflow-hidden rounded-xl ring-2",
                      index === activeImage
                        ? "ring-primary"
                        : "ring-transparent",
                    )}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
                </div>
              </ScrollRail>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

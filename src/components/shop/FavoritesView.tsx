"use client";

import Link from "next/link";
import { IconHeart, IconTrash } from "@tabler/icons-react";
import { useFavoritesStore } from "@/lib/favorites/store";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function FavoritesView() {
  const products = useFavoritesStore((s) => s.items);
  const clear = useFavoritesStore((s) => s.clear);

  return (
    <div className="flex min-h-full flex-col px-4 py-3">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Обране</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Очистити обране"
          disabled={products.length === 0}
          onClick={clear}
        >
          <IconTrash />
        </Button>
      </header>

      {products.length === 0 ? (
        <Empty className="min-h-[60dvh]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconHeart />
            </EmptyMedia>
            <EmptyTitle>Поки порожньо</EmptyTitle>
            <EmptyDescription>
              Додавай товари серцем на картці або на сторінці товару.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/" />} nativeButton={false}>
              До каталогу
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

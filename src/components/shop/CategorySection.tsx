"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/shop/ProductCard";
import { ScrollRail } from "@/components/shop/scroll-rail";
import type { ProductCard as ProductCardData } from "@/lib/catalog/types";

type CategorySectionProps = {
  categories: Array<{ slug: string; name: string }>;
  productsBySlug: Record<string, ProductCardData[]>;
};

export function CategorySection({
  categories: categoriesProp,
  productsBySlug: productsProp,
}: Partial<CategorySectionProps> = {}) {
  const categories = categoriesProp ?? [];
  const productsBySlug = productsProp ?? {};
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug ?? "");
  const active = categories.find((category) => category.slug === activeSlug);
  const products = productsBySlug[activeSlug] ?? [];

  if (categories.length === 0) return null;

  return (
    <section
      className="rounded-2xl bg-secondary p-6"
      aria-labelledby="category-section-title"
    >
      <Tabs
        value={activeSlug}
        onValueChange={(value) => {
          if (value) setActiveSlug(value);
        }}
        className="w-full min-w-0 gap-4"
      >
        <ScrollRail className="-mx-1 px-1">
          <TabsList
            variant="default"
            className="h-auto w-max max-w-none justify-start overflow-visible"
          >
            {categories.map((category) => (
              <TabsTrigger
                key={category.slug}
                value={category.slug}
                className="flex-none shrink-0 px-3"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollRail>

        <header className="flex flex-col gap-1">
          <h2
            id="category-section-title"
            className="text-2xl font-bold tracking-tight"
          >
            {active?.name ?? "Товари"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {products.length} товарів
          </p>
        </header>

        {categories.map((category) => (
          <TabsContent key={category.slug} value={category.slug} className="mt-0">
            <ul className="grid grid-cols-2 gap-3">
              {(productsBySlug[category.slug] ?? []).map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

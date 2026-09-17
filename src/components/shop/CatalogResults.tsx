import { ProductCard } from "@/components/shop/ProductCard";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ProductCard as ProductCardData } from "@/lib/catalog/types";

export function CatalogResults({
  title,
  products,
}: {
  title: string;
  products: ProductCardData[];
}) {
  return (
    <section className="mt-2 rounded-2xl bg-secondary p-4">
      <header className="mb-4 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {products.length
            ? `${products.length} товарів`
            : "Нічого не знайдено"}
        </p>
      </header>

      {products.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Порожньо</EmptyTitle>
            <EmptyDescription>
              Спробуй інші фільтри або скинь пошук.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

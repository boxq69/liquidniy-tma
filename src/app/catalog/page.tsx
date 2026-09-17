import Header from "@/components/shop/Header";
import { CatalogResults } from "@/components/shop/CatalogResults";
import { listCategories, listProducts, parseProductFilters } from "@/lib/catalog/queries";
import { pageTitleForFilters, searchParamsFromRecord } from "@/lib/catalog/params";
import { toProductCard } from "@/lib/catalog/map";

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const filters = parseProductFilters(
    searchParamsFromRecord(await searchParams),
  );
  let items: Awaited<ReturnType<typeof listProducts>> = [];
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  try {
    [items, categories] = await Promise.all([
      listProducts(filters),
      listCategories({ visibleOnly: true }),
    ]);
  } catch {
    items = [];
    categories = [];
  }
  const categoryName = categories.find(
    (category) => category.slug === filters.category,
  )?.name;

  return (
    <div>
      <Header showBanner={false} filters={filters} />
      <CatalogResults
        title={pageTitleForFilters(filters, categoryName)}
        products={items.map(toProductCard)}
      />
    </div>
  );
}

import { listCategories, listProducts } from "@/lib/catalog/queries";
import { toProductCard } from "@/lib/catalog/map";
import type { ProductCard } from "@/lib/catalog/types";
import type { Category } from "@/lib/types";

export type HomeCatalog = {
  categories: Array<Pick<Category, "slug" | "name">>;
  featured: ProductCard[];
  productsBySlug: Record<string, ProductCard[]>;
};

const EMPTY_CATALOG: HomeCatalog = {
  categories: [],
  featured: [],
  productsBySlug: {},
};

export async function getHomeCatalog(): Promise<HomeCatalog> {
  try {
    const [categories, products] = await Promise.all([
      listCategories({ visibleOnly: true, homeOnly: true }),
      listProducts(),
    ]);

    if (!Array.isArray(categories) || categories.length === 0) {
      return EMPTY_CATALOG;
    }

    const productsBySlug: Record<string, ProductCard[]> = {};
    for (const category of categories) {
      productsBySlug[category.slug] = products
        .filter((product) => product.category?.slug === category.slug)
        .map(toProductCard);
    }

    return {
      categories: categories.map(({ slug, name }) => ({ slug, name })),
      featured: products.filter((product) => product.is_featured).map(toProductCard),
      productsBySlug,
    };
  } catch {
    return EMPTY_CATALOG;
  }
}

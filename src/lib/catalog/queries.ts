import { bestPromotionForProduct, salePriceUah } from "@/lib/pricing";
import { listLivePromotions } from "@/lib/admin/marketing";
import type {
  AppliedPromotion,
  CatalogFilterMeta,
  Category,
  Product,
  ProductFilters,
  ProductImage,
  ProductVariant,
  ProductWithDetails,
  Promotion,
} from "@/lib/types";
import { filtersFromSearchParams } from "@/lib/catalog/params";
import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";

const PRODUCT_SELECT = `
  *,
  category:categories(*),
  images:product_images(*),
  variants:product_variants(*)
`;

type ProductRow = Product & {
  category?: Category | Category[] | null;
  images?: ProductImage[] | null;
  variants?: ProductVariant[] | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapProduct(
  row: ProductRow,
  promotions: Promotion[] = [],
): ProductWithDetails {
  const images = [...(row.images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const variants = [...(row.variants ?? [])];
  const min_price = variants.length
    ? Math.min(...variants.map((v) => v.price_uah))
    : undefined;
  const in_stock = variants.some((v) => v.stock > 0);
  const promotion = min_price != null
    ? bestPromotionForProduct(promotions, row.id, row.category_id, min_price)
    : null;
  const sale_price =
    min_price != null && promotion
      ? Math.min(...variants.map((v) => salePriceUah(v.price_uah, promotion)))
      : undefined;
  const applied: AppliedPromotion | null = promotion
    ? {
        id: promotion.id,
        name: promotion.name,
        badge_text: promotion.badge_text,
        discount_type: promotion.discount_type,
        discount_value: promotion.discount_value,
      }
    : null;
  return {
    ...row,
    is_featured: row.is_featured ?? false,
    category: asOne(row.category),
    images,
    variants,
    min_price,
    sale_price:
      sale_price != null && min_price != null && sale_price < min_price
        ? sale_price
        : undefined,
    in_stock,
    promotion: applied,
  };
}

async function loadPromotions() {
  try {
    return await listLivePromotions();
  } catch {
    return [];
  }
}

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "XXL"];

function selectedSizes(filters: ProductFilters) {
  const values = [...(filters.sizes ?? [])];
  if (filters.size) values.push(filters.size);
  return [...new Set(values.filter(Boolean))];
}

function selectedColors(filters: ProductFilters) {
  const values = [...(filters.colors ?? [])];
  if (filters.color) values.push(filters.color);
  return [...new Set(values.filter(Boolean))];
}

function classifySize(size: string): "clothing" | "shoe" | "other" {
  const upper = size.trim().toUpperCase();
  if (CLOTHING_SIZES.includes(upper)) return "clothing";
  if (/^\d{2}(?:\.5)?$/.test(size.trim())) {
    const n = Number(size);
    if (n >= 34 && n <= 50) return "shoe";
  }
  return "other";
}

function applyFilters(
  products: ProductWithDetails[],
  filters: ProductFilters,
): ProductWithDetails[] {
  const sizes = selectedSizes(filters);
  const colors = selectedColors(filters);
  const q = filters.q?.trim().toLowerCase();

  const filtered = products.filter((product) => {
    if (filters.category && product.category?.slug !== filters.category) {
      return false;
    }
    if (q) {
      const hay = `${product.title} ${product.description} ${product.category?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (sizes.length && !product.variants.some((v) => sizes.includes(v.size))) {
      return false;
    }
    if (colors.length && !product.variants.some((v) => colors.includes(v.color))) {
      return false;
    }
    if (
      filters.minPrice != null &&
      (product.min_price == null || product.min_price < filters.minPrice)
    ) {
      return false;
    }
    if (
      filters.maxPrice != null &&
      (product.min_price == null || product.min_price > filters.maxPrice)
    ) {
      return false;
    }
    if (filters.inStock === true && !product.in_stock) {
      return false;
    }
    if (filters.featured === true && !product.is_featured) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered];
  if (filters.sort === "price_asc") {
    sorted.sort((a, b) => (a.min_price ?? 0) - (b.min_price ?? 0));
  } else if (filters.sort === "price_desc") {
    sorted.sort((a, b) => (b.min_price ?? 0) - (a.min_price ?? 0));
  } else if (filters.sort === "newest") {
    sorted.sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
  }
  return sorted;
}

export async function listCategories(opts: {
  visibleOnly?: boolean;
  homeOnly?: boolean;
} = {}): Promise<Category[]> {
  const supabase = createAdminClient();
  type CategoryRow = {
    id: string;
    name: string;
    slug: string;
    sort_order: number;
    is_visible?: boolean | null;
    show_on_home?: boolean | null;
  };

  const full = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, is_visible, show_on_home")
    .order("sort_order", { ascending: true });

  let data: CategoryRow[] | null = full.data as CategoryRow[] | null;
  let error = full.error;

  if (error && isMissingColumnError(error)) {
    const basic = await supabase
      .from("categories")
      .select("id, name, slug, sort_order")
      .order("sort_order", { ascending: true });
    data = (basic.data ?? []) as CategoryRow[];
    error = basic.error;
  } else if (!error) {
    if (opts.visibleOnly) {
      data = (data ?? []).filter((row) => row.is_visible !== false);
    }
    if (opts.homeOnly) {
      data = (data ?? []).filter((row) => row.show_on_home !== false);
    }
  }

  if (error) throw new ApiError(500, error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    sort_order: row.sort_order,
    is_visible: row.is_visible ?? true,
    show_on_home: row.show_on_home ?? true,
  }));
}

export async function listProducts(
  filters: ProductFilters = {},
  opts: { includeInactive?: boolean } = {},
): Promise<ProductWithDetails[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("sort_order", { ascending: true });

  if (!opts.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);

  const promotions = await loadPromotions();
  const mapped = ((data ?? []) as ProductRow[]).map((row) =>
    mapProduct(row, promotions),
  );
  return applyFilters(mapped, filters);
}

export async function getProductBySlug(
  slug: string,
  opts: { includeInactive?: boolean } = {},
): Promise<ProductWithDetails | null> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug);

  if (!opts.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!data) return null;
  const promotions = await loadPromotions();
  return mapProduct(data as ProductRow, promotions);
}

export async function getProductById(
  id: string,
): Promise<ProductWithDetails | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!data) return null;
  const promotions = await loadPromotions();
  return mapProduct(data as ProductRow, promotions);
}

export async function getCatalogFilters(): Promise<CatalogFilterMeta> {
  const [products, categories] = await Promise.all([
    listProducts(),
    listCategories({ visibleOnly: true }),
  ]);
  const sizes = new Set<string>();
  const colors = new Set<string>();
  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;

  for (const product of products) {
    for (const variant of product.variants) {
      sizes.add(variant.size);
      colors.add(variant.color);
      minPrice = Math.min(minPrice, variant.price_uah);
      maxPrice = Math.max(maxPrice, variant.price_uah);
    }
  }

  const clothingSizes: string[] = [];
  const shoeSizes: string[] = [];
  const otherSizes: string[] = [];
  for (const size of sizes) {
    const kind = classifySize(size);
    if (kind === "clothing") clothingSizes.push(size);
    else if (kind === "shoe") shoeSizes.push(size);
    else otherSizes.push(size);
  }

  clothingSizes.sort(
    (a, b) => CLOTHING_SIZES.indexOf(a.toUpperCase()) - CLOTHING_SIZES.indexOf(b.toUpperCase()),
  );
  shoeSizes.sort((a, b) => Number(a) - Number(b));
  otherSizes.sort((a, b) => a.localeCompare(b, "uk"));

  return {
    sizes: [...clothingSizes, ...shoeSizes, ...otherSizes],
    clothingSizes,
    shoeSizes,
    otherSizes,
    colors: [...colors].sort((a, b) => a.localeCompare(b, "uk")),
    categories: categories.map(({ slug, name }) => ({ slug, name })),
    minPrice: Number.isFinite(minPrice) ? minPrice : 0,
    maxPrice,
  };
}

export function parseProductFilters(
  searchParams: URLSearchParams,
): ProductFilters {
  return filtersFromSearchParams(searchParams);
}

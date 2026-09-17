import type { ProductFilters, ProductSort } from "@/lib/types";

export const PRODUCT_SORTS: Array<{ value: ProductSort; label: string }> = [
  { value: "relevance", label: "За порядком" },
  { value: "newest", label: "Новіші" },
  { value: "price_asc", label: "Ціна: дешевші" },
  { value: "price_desc", label: "Ціна: дорожчі" },
];

function csv(values?: string[]) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

export function parseProductSort(value: string | null | undefined): ProductSort {
  if (
    value === "newest" ||
    value === "price_asc" ||
    value === "price_desc" ||
    value === "relevance"
  ) {
    return value;
  }
  return "relevance";
}

export function filtersFromSearchParams(
  searchParams: URLSearchParams,
): ProductFilters {
  const sizes = [
    ...searchParams.getAll("size"),
    ...searchParams.getAll("sizes").flatMap((item) => item.split(",")),
  ]
    .map((item) => item.trim())
    .filter(Boolean);
  const colors = [
    ...searchParams.getAll("color"),
    ...searchParams.getAll("colors").flatMap((item) => item.split(",")),
  ]
    .map((item) => item.trim())
    .filter(Boolean);
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const inStock = searchParams.get("inStock");
  const featured = searchParams.get("featured");

  return {
    category: searchParams.get("category") ?? undefined,
    sizes: sizes.length ? [...new Set(sizes)] : undefined,
    colors: colors.length ? [...new Set(colors)] : undefined,
    q: searchParams.get("q")?.trim() || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    inStock:
      inStock == null ? undefined : inStock === "1" || inStock === "true",
    featured:
      featured === "1" || featured === "true" ? true : undefined,
    sort: parseProductSort(searchParams.get("sort")),
  };
}

export function catalogSearchParams(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.featured) params.set("featured", "1");
  if (filters.inStock) params.set("inStock", "1");
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.sort && filters.sort !== "relevance") params.set("sort", filters.sort);
  for (const size of csv(filters.sizes ?? (filters.size ? [filters.size] : []))) {
    params.append("size", size);
  }
  for (const color of csv(filters.colors ?? (filters.color ? [filters.color] : []))) {
    params.append("color", color);
  }
  return params;
}

export function catalogHref(filters: ProductFilters = {}): string {
  const qs = catalogSearchParams(filters).toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export function searchParamsFromRecord(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value == null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item) params.append(key, item);
    }
  }
  return params;
}

export function pageTitleForFilters(
  filters: ProductFilters,
  categoryName?: string,
): string {
  if (filters.featured) return "Бестселери";
  if (filters.q) return `Пошук: ${filters.q}`;
  if (categoryName) return categoryName;
  if (filters.category) return filters.category;
  return "Каталог";
}

export function firstParam(
  record: Record<string, string | string[] | undefined>,
  key: string,
) {
  return firstString(record[key]);
}

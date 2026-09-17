import { handleRoute, jsonOk } from "@/lib/api/http";
import { getCatalogFilters, listProducts, parseProductFilters } from "@/lib/catalog/queries";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("meta") === "1") {
      const filters = await getCatalogFilters();
      return jsonOk(filters);
    }
    const items = await listProducts(parseProductFilters(searchParams));
    return jsonOk({ items });
  });
}

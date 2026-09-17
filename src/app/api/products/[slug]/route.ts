import { handleRoute, jsonOk, ApiError } from "@/lib/api/http";
import { getProductBySlug } from "@/lib/catalog/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return handleRoute(async () => {
    const { slug } = await params;
    const product = await getProductBySlug(decodeURIComponent(slug));
    if (!product) throw new ApiError(404, "Товар не знайдено");
    return jsonOk({ product });
  });
}

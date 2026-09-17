import { ApiError, handleRoute, jsonOk } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/guards";
import { removeFavorite } from "@/lib/favorites/queries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  return handleRoute(async () => {
    const session = await requireSession();
    const { productId } = await params;
    if (!UUID_RE.test(productId)) {
      throw new ApiError(400, "Невірний id товару");
    }
    const items = await removeFavorite(session.profileId, productId);
    return jsonOk({
      items,
      productIds: items.map((item) => item.id),
    });
  });
}

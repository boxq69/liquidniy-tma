import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/guards";
import {
  addFavorite,
  listFavoriteProducts,
  replaceFavorites,
} from "@/lib/favorites/queries";
import {
  favoriteProductIdSchema,
  favoritesPayloadSchema,
} from "@/lib/validations/schemas";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    const items = await listFavoriteProducts(session.profileId);
    return jsonOk({
      items,
      productIds: items.map((item) => item.id),
    });
  });
}

export async function PUT(request: Request) {
  return handleRoute(async () => {
    const session = await requireSession();
    const payload = parseBody(favoritesPayloadSchema, await request.json());
    const items = await replaceFavorites(session.profileId, payload.productIds);
    return jsonOk({
      items,
      productIds: items.map((item) => item.id),
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await requireSession();
    const { productId } = parseBody(
      favoriteProductIdSchema,
      await request.json(),
    );
    const items = await addFavorite(session.profileId, productId);
    return jsonOk({
      items,
      productIds: items.map((item) => item.id),
    });
  });
}

import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { getHomeBannerAdmin, updateHomeBanner } from "@/lib/site/banner";
import { bannerPatchSchema } from "@/lib/validations/schemas";

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    const banner = await getHomeBannerAdmin();
    return jsonOk({ banner });
  });
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const input = parseBody(bannerPatchSchema, await request.json());
    const banner = await updateHomeBanner(input);
    return jsonOk({ banner });
  });
}

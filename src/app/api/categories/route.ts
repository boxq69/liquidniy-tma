import { handleRoute, jsonOk } from "@/lib/api/http";
import { listCategories } from "@/lib/catalog/queries";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const homeOnly = searchParams.get("home") === "1";
    const items = await listCategories({
      visibleOnly: true,
      homeOnly,
    });
    return jsonOk({ items });
  });
}

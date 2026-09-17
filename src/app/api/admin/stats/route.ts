import { handleRoute, jsonOk } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminStats } from "@/lib/admin/stats";
import { parseStatsRange } from "@/lib/admin/stats-range";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const stats = await getAdminStats(parseStatsRange(searchParams.get("range")));
    return jsonOk({ stats });
  });
}

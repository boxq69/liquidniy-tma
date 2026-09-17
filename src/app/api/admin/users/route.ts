import { handleRoute, jsonOk } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { listAdminUsers } from "@/lib/admin/users";

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    const items = await listAdminUsers();
    return jsonOk({ items });
  });
}

import { handleRoute, jsonOk } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { sessionHasAdminAccess } from "@/lib/auth/admins";

export async function GET() {
  return handleRoute(async () => {
    const session = await getSession();
    if (!session?.profileId) {
      return jsonOk({ user: null });
    }
    const isAdmin = await sessionHasAdminAccess(session);
    return jsonOk({ user: { ...session, isAdmin } });
  });
}

import { handleRoute, jsonOk } from "@/lib/api/http";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  return handleRoute(async () => {
    await clearSessionCookie();
    return jsonOk({ ok: true });
  });
}

import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { updateAdminUser } from "@/lib/admin/users";
import { adminUserPatchSchema } from "@/lib/validations/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const input = parseBody(adminUserPatchSchema, await request.json());
    const user = await updateAdminUser(id, input, session.telegramId);
    return jsonOk({ user });
  });
}

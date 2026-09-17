import { getSession } from "@/lib/auth/session";
import { isTelegramAdmin } from "@/lib/auth/admins";
import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/types";

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession().catch(() => null);
  if (!session?.profileId) {
    throw new ApiError(401, "Потрібна авторизація через Telegram");
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  const supabase = createAdminClient();
  const allowed = await isTelegramAdmin(supabase, session.telegramId);
  if (!allowed) {
    throw new ApiError(403, "Немає доступу до адмінки");
  }
  return { ...session, isAdmin: true };
}

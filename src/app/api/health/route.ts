import { handleRoute, jsonOk } from "@/lib/api/http";
import { getTelegramBotToken } from "@/lib/telegram/env";

export async function GET() {
  return handleRoute(async () => {
    return jsonOk({
      ok: true,
      supabase: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
          process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      ),
      telegram: Boolean(getTelegramBotToken()),
    });
  });
}

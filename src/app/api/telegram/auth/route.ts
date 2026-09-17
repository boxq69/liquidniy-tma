import { ApiError, handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { getTelegramBotToken } from "@/lib/telegram/env";
import { issueSession } from "@/lib/telegram/profiles";
import { setSessionCookie } from "@/lib/auth/session";
import { validateInitData } from "@/lib/telegram/validate";
import { telegramAuthSchema } from "@/lib/validations/schemas";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = parseBody(telegramAuthSchema, await request.json());
    const botToken = getTelegramBotToken();
    if (!botToken) {
      throw new ApiError(
        500,
        "TELEGRAM_BOT_TOKEN порожній. Додай токен з BotFather у .env.local і перезапусти npm run dev",
      );
    }

    let parsed;
    try {
      parsed = validateInitData(body.initData, botToken);
    } catch (err) {
      throw new ApiError(
        401,
        err instanceof Error ? err.message : "Auth failed",
      );
    }

    const { sessionUser, token } = await issueSession(parsed.user);
    await setSessionCookie(token);

    return jsonOk({
      user: sessionUser,
      startParam: parsed.startParam ?? null,
    });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { adminIdsFromEnv } from "@/lib/auth/admins";
import { issueSession } from "@/lib/telegram/profiles";
import { setSessionCookie } from "@/lib/auth/session";

function isLocalDev(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return false;
  const host = request.headers.get("host") ?? "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

export async function GET(request: NextRequest) {
  if (!isLocalDev(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const telegramId = adminIdsFromEnv()[0];
  if (!telegramId) {
    return NextResponse.json(
      { error: "Set ADMIN_TELEGRAM_IDS in .env.local" },
      { status: 400 },
    );
  }

  const { token } = await issueSession({
    id: telegramId,
    username: "admin",
    first_name: "Admin",
    last_name: null,
  });
  await setSessionCookie(token);
  return NextResponse.redirect(new URL("/admin", request.url));
}

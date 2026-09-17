import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function parseBody<T>(schema: ZodType<T>, json: unknown): T {
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiError(
      400,
      result.error.issues[0]?.message ?? "Невірні дані",
    );
  }
  return result.data;
}

function isMissingSupabase(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  return (
    message.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    message.includes("SUPABASE_SERVICE_ROLE_KEY")
  );
}

function isFetchFailed(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const cause =
    err instanceof Error && err.cause instanceof Error ? err.cause.message : "";
  return /fetch failed/i.test(`${message} ${cause} ${String(err)}`);
}

export function toErrorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return jsonError(err.message, err.status);
  }
  if (isMissingSupabase(err)) {
    return jsonError(
      "Supabase не налаштовано. Додай URL і service role ключ у .env.local",
      503,
    );
  }
  if (isFetchFailed(err)) {
    return jsonError(
      "Немає звʼязку з базою. Відкрий проєкт Supabase — він міг бути на паузі.",
      503,
    );
  }
  const message = err instanceof Error ? err.message : "Internal error";
  return jsonError(message, 500);
}

export async function handleRoute(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (err) {
    return toErrorResponse(err);
  }
}

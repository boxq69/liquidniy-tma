import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus, OrderWithItems, Profile } from "@/lib/types";
import { formatNovaPoshtaAddress } from "@/lib/novaposhta/format";
import { formatPrice } from "@/lib/utils/app";
import { listAdminTelegramIds } from "@/lib/auth/admins";
import { buildAdminOrderUrl, sendTelegramMessage } from "@/lib/telegram/bot";
import { clearCart } from "@/lib/cart/queries";
import type { CheckoutInput } from "@/lib/validations/schemas";
import type { SessionUser } from "@/lib/types";

const ORDER_SELECT = `
  *,
  items:order_items(*),
  profile:profiles(id, telegram_id, username, first_name, last_name)
`;

type PlaceOrderResult = {
  orderId: string;
  totalUah: number;
};

export async function placeOrder(
  session: SessionUser,
  input: CheckoutInput,
): Promise<PlaceOrderResult> {
  const supabase = createAdminClient();
  const addressLabel = formatNovaPoshtaAddress(input.novaPoshta);
  const comment = [
    input.comment?.trim() || null,
    `Доставка: ${addressLabel}`,
    `Оплата: ${input.paymentMethod}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { data, error } = await supabase.rpc("place_order", {
    p_profile_id: session.profileId,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_comment: comment,
    p_telegram_snapshot: {
      novaPoshta: input.novaPoshta,
      customerAddress: addressLabel,
      paymentMethod: input.paymentMethod,
      telegramId: session.telegramId,
      username: session.username,
    },
    p_items: input.items.map((item) => ({
      variant_id: item.variantId,
      qty: item.qty,
    })),
    p_promo_code: input.promoCode?.trim() || null,
  });

  if (error) {
    const message = error.message ?? "Не вдалося створити замовлення";
    const clientError =
      message.includes("Невідомий") ||
      message.includes("Недостатньо") ||
      message.includes("недоступний") ||
      message.includes("Кошик") ||
      message.includes("Промокод") ||
      message.includes("Ліміт") ||
      message.includes("Мінімальна") ||
      message.includes("invalid input syntax") ||
      message.includes("invalid_text_representation");
    throw new ApiError(clientError ? 400 : 500, message);
  }

  const result = (
    typeof data === "string" ? JSON.parse(data) : data
  ) as PlaceOrderResult;
  if (!result?.orderId) {
    throw new ApiError(500, "Замовлення не повернуло id");
  }

  await clearCart(session.profileId).catch(() => undefined);
  return result;
}

export async function listOrdersForProfile(
  profileId: string,
): Promise<OrderWithItems[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(500, error.message);
  return (data ?? []) as OrderWithItems[];
}

export async function listAllOrders(status?: OrderStatus) {
  const supabase = createAdminClient();
  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);
  return (data ?? []) as Array<OrderWithItems & { profile?: Profile | null }>;
}

export async function getOrderById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  return (data as (OrderWithItems & { profile?: Profile | null }) | null) ?? null;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const order = await getOrderById(id);
  if (!order) throw new ApiError(404, "Замовлення не знайдено");
  if (order.status === status) return order;

  const supabase = createAdminClient();
  const cancelling =
    status === "cancelled" &&
    (order.status === "new" || order.status === "processing");

  if (cancelling) {
    const { error } = await supabase.rpc("restore_order_stock", {
      p_order_id: id,
    });
    if (error) throw new ApiError(500, error.message);
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new ApiError(500, error.message);

  const updated = await getOrderById(id);
  if (!updated) throw new ApiError(500, "Не вдалося прочитати замовлення");
  return updated;
}

export async function notifyAdminsAboutOrder(
  result: PlaceOrderResult,
  input: CheckoutInput,
) {
  const supabase = createAdminClient();
  const ids = await listAdminTelegramIds(supabase);
  if (!ids.length || !process.env.TELEGRAM_BOT_TOKEN) return;

  const addressLabel = formatNovaPoshtaAddress(input.novaPoshta);
  const order = await getOrderById(result.orderId);
  const lines = (order?.items ?? []).map(
    (item) =>
      `• ${item.title_snapshot} (${item.size_snapshot}) × ${item.qty} — ${formatPrice(item.price_uah * item.qty)}`,
  );

  const text = [
    "<b>Нове замовлення</b>",
    `${input.customerName} · ${input.customerPhone}`,
    addressLabel,
    ...lines,
    `<b>Разом: ${formatPrice(result.totalUah)}</b>`,
    "",
    `<a href="${buildAdminOrderUrl(result.orderId)}">Відкрити в адмінці</a>`,
  ].join("\n");

  await Promise.allSettled(
    ids.map((chatId) => sendTelegramMessage(chatId, text)),
  );
}

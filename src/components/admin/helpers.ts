import { formatDiscountLabel, isScheduleLive } from "@/lib/pricing";
import type { AppliesTo, DiscountType } from "@/lib/types";

export function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function appliesToLabel(value: AppliesTo) {
  if (value === "products") return "Обрані товари";
  if (value === "categories") return "Категорії";
  return "Увесь каталог";
}

export function scheduleLabel(
  isActive: boolean,
  startsAt: string | null,
  endsAt: string | null,
) {
  if (!isActive) return "Вимкнено";
  if (!isScheduleLive(isActive, startsAt, endsAt)) return "Поза періодом";
  if (endsAt) {
    return `До ${new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "short",
    }).format(new Date(endsAt))}`;
  }
  return "Активно";
}

export function discountBadge(type: DiscountType, value: number) {
  return formatDiscountLabel(type, value);
}

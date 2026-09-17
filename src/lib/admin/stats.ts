import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  differenceInDays,
} from "date-fns";
import { uk } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/http";
import { isMissingColumnError } from "@/lib/supabase/errors";
import type { AdminStats, AdminStatsPoint, OrderStatus, StatsRange } from "@/lib/types";

export { parseStatsRange, STATS_RANGES } from "@/lib/admin/stats-range";

const STATUSES: OrderStatus[] = ["new", "processing", "done", "cancelled"];

async function countRows(
  table: string,
  column?: string,
  value?: string | boolean | number,
) {
  const supabase = createAdminClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (column != null && value !== undefined) {
    query = query.eq(column, value);
  }
  const { count, error } = await query;
  if (error) {
    if (isMissingColumnError(error)) return 0;
    throw new ApiError(500, error.message);
  }
  return count ?? 0;
}

function rangeDays(range: StatsRange) {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  if (range === "365d") return 365;
  return null;
}

function bounds(range: StatsRange, now = new Date()) {
  const to = endOfDay(now);
  const days = rangeDays(range);
  if (days == null) return { from: null as Date | null, to };
  return { from: startOfDay(subDays(to, days - 1)), to };
}

function previousBounds(from: Date, to: Date) {
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  return { from: prevFrom, to: prevTo };
}

type Granularity = "day" | "week" | "month";

function granularityFor(from: Date, to: Date, range: StatsRange): Granularity {
  if (range === "365d") return "week";
  if (range === "all" && differenceInDays(to, from) > 180) return "month";
  if (range === "all" && differenceInDays(to, from) > 60) return "week";
  return "day";
}

function bucketStart(date: Date, grain: Granularity) {
  if (grain === "month") return startOfMonth(date);
  if (grain === "week") return startOfWeek(date, { weekStartsOn: 1 });
  return startOfDay(date);
}

function bucketKey(date: Date, grain: Granularity) {
  return format(bucketStart(date, grain), "yyyy-MM-dd");
}

function bucketLabel(date: Date, grain: Granularity) {
  if (grain === "month") return format(date, "LLL yyyy", { locale: uk });
  return format(date, "d MMM", { locale: uk });
}

function buildBuckets(from: Date, to: Date, grain: Granularity): AdminStatsPoint[] {
  const interval = { start: from, end: to };
  const dates =
    grain === "month"
      ? eachMonthOfInterval(interval)
      : grain === "week"
        ? eachWeekOfInterval(interval, { weekStartsOn: 1 })
        : eachDayOfInterval(interval);
  return dates.map((date) => ({
    date: format(bucketStart(date, grain), "yyyy-MM-dd"),
    label: bucketLabel(date, grain),
    orders: 0,
    revenue: 0,
    users: 0,
  }));
}

function summarize(
  rows: Array<{ created_at: string; status?: string; total_uah?: number }>,
  from: Date | null,
  to: Date,
) {
  let orders = 0;
  let revenue = 0;
  const statusCounts: Record<OrderStatus, number> = {
    new: 0,
    processing: 0,
    done: 0,
    cancelled: 0,
  };
  for (const row of rows) {
    const created = new Date(row.created_at);
    if (from && created < from) continue;
    if (created > to) continue;
    orders += 1;
    const status = row.status as OrderStatus | undefined;
    if (status && status in statusCounts) statusCounts[status] += 1;
    if (status === "done") revenue += Number(row.total_uah ?? 0);
  }
  return { orders, revenue, statusCounts };
}

export async function getAdminStats(range: StatsRange = "30d"): Promise<AdminStats> {
  const supabase = createAdminClient();
  const { from, to } = bounds(range);
  const isoTo = to.toISOString();
  const fetchFrom = from ? previousBounds(from, to).from.toISOString() : null;

  const [
    users,
    blockedUsers,
    orderCounts,
    productsTotal,
    productsActive,
    productsFeatured,
    lowStock,
    categoriesTotal,
    categoriesVisible,
    categoriesHome,
    promotionsTotal,
    promoCodesTotal,
    promoCodesActive,
    ordersInRange,
    usersInRange,
  ] = await Promise.all([
    countRows("profiles"),
    countRows("profiles", "is_blocked", true),
    Promise.all(STATUSES.map((status) => countRows("orders", "status", status))),
    countRows("products"),
    countRows("products", "is_active", true),
    countRows("products", "is_featured", true),
    supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .lte("stock", 3),
    countRows("categories"),
    countRows("categories", "is_visible", true),
    countRows("categories", "show_on_home", true),
    countRows("promotions"),
    countRows("promo_codes"),
    countRows("promo_codes", "is_active", true),
    (() => {
      let query = supabase
        .from("orders")
        .select("id, status, total_uah, created_at")
        .lte("created_at", isoTo)
        .order("created_at", { ascending: true })
        .limit(8000);
      if (fetchFrom) query = query.gte("created_at", fetchFrom);
      return query;
    })(),
    (() => {
      let query = supabase
        .from("profiles")
        .select("id, created_at")
        .lte("created_at", isoTo)
        .order("created_at", { ascending: true })
        .limit(8000);
      if (fetchFrom) query = query.gte("created_at", fetchFrom);
      return query;
    })(),
  ]);

  if (lowStock.error) throw new ApiError(500, lowStock.error.message);
  if (ordersInRange.error) throw new ApiError(500, ordersInRange.error.message);
  if (usersInRange.error) throw new ApiError(500, usersInRange.error.message);

  const orderRows = ordersInRange.data ?? [];
  const userRows = usersInRange.data ?? [];
  const earliestOrder = orderRows[0]?.created_at;
  const earliestUser = userRows[0]?.created_at;
  const seriesFrom =
    from ??
    startOfDay(
      new Date(
        earliestOrder && earliestUser
          ? Math.min(new Date(earliestOrder).getTime(), new Date(earliestUser).getTime())
          : earliestOrder
            ? new Date(earliestOrder).getTime()
            : earliestUser
              ? new Date(earliestUser).getTime()
              : subDays(to, 29).getTime(),
      ),
    );

  const grain = granularityFor(seriesFrom, to, range);
  const series = buildBuckets(seriesFrom, to, grain);
  const byDate = new Map(series.map((point) => [point.date, point]));

  for (const row of orderRows) {
    const created = new Date(row.created_at);
    if (created < seriesFrom || created > to) continue;
    const point = byDate.get(bucketKey(created, grain));
    if (!point) continue;
    point.orders += 1;
    if (row.status === "done") point.revenue += Number(row.total_uah ?? 0);
  }
  for (const row of userRows) {
    const created = new Date(row.created_at);
    if (created < seriesFrom || created > to) continue;
    const point = byDate.get(bucketKey(created, grain));
    if (point) point.users += 1;
  }

  const current = summarize(orderRows, seriesFrom, to);
  const usersNow = userRows.filter((row) => {
    const created = new Date(row.created_at);
    return created >= seriesFrom && created <= to;
  }).length;

  const prevWindow = previousBounds(seriesFrom, to);
  const previous = summarize(orderRows, prevWindow.from, prevWindow.to);
  const usersPrev = userRows.filter((row) => {
    const created = new Date(row.created_at);
    return created >= prevWindow.from && created <= prevWindow.to;
  }).length;

  const [newCount, processing, done, cancelled] = orderCounts;
  const doneOrders = current.statusCounts.done || 1;

  return {
    range,
    from: seriesFrom.toISOString(),
    to: to.toISOString(),
    users,
    blockedUsers,
    orders: {
      total: newCount + processing + done + cancelled,
      new: newCount,
      processing,
      done,
      cancelled,
    },
    revenueUah: current.revenue,
    products: {
      total: productsTotal,
      active: productsActive,
      featured: productsFeatured,
      lowStock: lowStock.count ?? 0,
    },
    categories: {
      total: categoriesTotal,
      visible: categoriesVisible,
      onHome: categoriesHome,
    },
    promotions: {
      total: promotionsTotal,
      live: promotionsTotal,
    },
    promoCodes: {
      total: promoCodesTotal,
      active: promoCodesActive,
    },
    period: {
      orders: current.orders,
      revenueUah: current.revenue,
      users: usersNow,
      aovUah: current.statusCounts.done
        ? Math.round(current.revenue / doneOrders)
        : 0,
    },
    previous: {
      orders: previous.orders,
      revenueUah: previous.revenue,
      users: usersPrev,
    },
    series,
    statusBreakdown: STATUSES.map((status) => ({
      status,
      count: current.statusCounts[status],
    })),
  };
}

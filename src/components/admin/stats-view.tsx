"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api/client";
import { STATS_RANGES } from "@/lib/admin/stats-range";
import type { AdminStats, StatsRange } from "@/lib/types";
import { formatPrice, ORDER_STATUS_LABELS } from "@/lib/utils/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const METRICS = [
  { value: "revenue", label: "Виручка" },
  { value: "orders", label: "Замовлення" },
  { value: "users", label: "Користувачі" },
] as const;

type Metric = (typeof METRICS)[number]["value"];

const seriesConfig = {
  revenue: { label: "Виручка", color: "var(--chart-1)" },
  orders: { label: "Замовлення", color: "var(--chart-2)" },
  users: { label: "Користувачі", color: "var(--chart-3)" },
} satisfies ChartConfig;

const statusConfig = {
  new: { label: ORDER_STATUS_LABELS.new, color: "var(--chart-1)" },
  processing: { label: ORDER_STATUS_LABELS.processing, color: "var(--chart-2)" },
  done: { label: ORDER_STATUS_LABELS.done, color: "var(--chart-3)" },
  cancelled: { label: ORDER_STATUS_LABELS.cancelled, color: "var(--chart-4)" },
} satisfies ChartConfig;

function changePercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function ChangeBadge({ current, previous }: { current: number; previous: number }) {
  const change = changePercent(current, previous);
  if (change == null) {
    return <Badge variant="secondary">нові дані</Badge>;
  }
  if (change === 0) {
    return <Badge variant="outline">без змін</Badge>;
  }
  const label = `${change > 0 ? "+" : ""}${change}%`;
  if (change < 0) {
    return <Badge variant="destructive">{label}</Badge>;
  }
  return <Badge variant="secondary">{label}</Badge>;
}

export function AdminStatsView() {
  const [range, setRange] = useState<StatsRange>("30d");
  const [metric, setMetric] = useState<Metric>("revenue");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.admin
      .stats(range)
      .then(({ stats: next }) => {
        if (cancelled) return;
        setError(null);
        setStats(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiRequestError
            ? err.message
            : "Не вдалося завантажити статистику",
        );
        toast.error("Статистика недоступна");
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const periodLabel = stats
    ? `${format(new Date(stats.from), "d MMM", { locale: uk })} – ${format(
        new Date(stats.to),
        "d MMM yyyy",
        { locale: uk },
      )}`
    : null;

  const kpis = stats
    ? [
        {
          title: "Виручка",
          value: formatPrice(stats.period.revenueUah),
          current: stats.period.revenueUah,
          previous: stats.previous.revenueUah,
          hint: "Виконані замовлення",
        },
        {
          title: "Замовлення",
          value: String(stats.period.orders),
          current: stats.period.orders,
          previous: stats.previous.orders,
          hint: "Усі статуси за період",
        },
        {
          title: "Середній чек",
          value: formatPrice(stats.period.aovUah),
          current: stats.period.aovUah,
          previous: 0,
          hint: "Виручка / виконані",
          hideChange: true,
        },
        {
          title: "Нові користувачі",
          value: String(stats.period.users),
          current: stats.period.users,
          previous: stats.previous.users,
          hint: "Реєстрації за період",
        },
      ]
    : [];

  const statusData =
    stats?.statusBreakdown.map((item) => ({
      ...item,
      fill: `var(--color-${item.status})`,
    })) ?? [];
  const hasStatus = statusData.some((item) => item.count > 0);

  const catalog = stats
    ? [
        {
          title: "Товари",
          value: String(stats.products.active),
          hint: `${stats.products.total} усього · ${stats.products.featured} хітів`,
        },
        {
          title: "Мало на складі",
          value: String(stats.products.lowStock),
          hint: "Варіанти ≤ 3 шт.",
        },
        {
          title: "Категорії",
          value: String(stats.categories.onHome),
          hint: `${stats.categories.visible} видимих з ${stats.categories.total}`,
        },
        {
          title: "Промо",
          value: `${stats.promotions.total} / ${stats.promoCodes.active}`,
          hint: "Акції · активні коди",
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ToggleGroup
          value={[range]}
          onValueChange={(value) => {
            const next = value[0] as StatsRange | undefined;
            if (next) setRange(next);
          }}
          size="sm"
          className="flex max-w-full flex-wrap"
        >
          {STATS_RANGES.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {periodLabel ? (
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        ) : null}
      </div>

      {!stats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((card) => (
            <Card key={card.title} size="sm">
              <CardHeader>
                <CardDescription>{card.title}</CardDescription>
                <CardTitle className="text-xl tabular-nums">{card.value}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {card.hideChange || range === "all" ? (
                  <p className="text-xs text-muted-foreground">{card.hint}</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <ChangeBadge current={card.current} previous={card.previous} />
                    <span className="text-xs text-muted-foreground">
                      vs попередній період
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Динаміка</CardTitle>
          <CardDescription>
            {metric === "revenue"
              ? "Виручка з виконаних замовлень"
              : metric === "orders"
                ? "Кількість замовлень"
                : "Нові користувачі"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ToggleGroup
            value={[metric]}
            onValueChange={(value) => {
              const next = value[0] as Metric | undefined;
              if (next) setMetric(next);
            }}
            size="sm"
          >
            {METRICS.map((item) => (
              <ToggleGroupItem key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {!stats ? (
            <Skeleton className="aspect-[4/3] w-full rounded-xl sm:aspect-video" />
          ) : (
            <ChartContainer
              config={seriesConfig}
              className="aspect-[4/3] w-full sm:aspect-video"
            >
              <AreaChart data={stats.series} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey={metric}
                  type="monotone"
                  fill={`var(--color-${metric})`}
                  fillOpacity={0.35}
                  stroke={`var(--color-${metric})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Статуси за період</CardTitle>
            <CardDescription>Розподіл замовлень у вибраному вікні</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Skeleton className="mx-auto aspect-square max-h-56 w-full" />
            ) : hasStatus ? (
              <ChartContainer
                config={statusConfig}
                className="mx-auto aspect-square max-h-64"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="status" hideLabel />}
                  />
                  <Pie data={statusData} dataKey="count" nameKey="status" />
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                За цей період замовлень ще немає.
              </p>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Каталог зараз</CardTitle>
            <CardDescription>Поза періодом, актуальний зріз</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {catalog.map((card) => (
                  <div key={card.title} className="flex flex-col gap-1 rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    <p className="text-lg font-semibold tabular-nums">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.hint}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button render={<Link href="/admin/orders" />} nativeButton={false}>
          До замовлень
        </Button>
        <Button
          variant="outline"
          render={<Link href="/admin/products" />}
          nativeButton={false}
        >
          Товари
        </Button>
        <Button
          variant="outline"
          render={<Link href="/admin/promotions" />}
          nativeButton={false}
        >
          Акції
        </Button>
        <Button
          variant="outline"
          render={<Link href="/admin/promo-codes" />}
          nativeButton={false}
        >
          Промокоди
        </Button>
      </div>
    </div>
  );
}
